const PYODIDE_VERSION = 'v0.24.1';
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

/** @type {any} */
let pyodide = null;

async function loadPyodideModule() {
	try {
		/* @vite-ignore */
		// @ts-ignore
		const pyodideModule = await import('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.mjs');
		return pyodideModule;
	} catch (error) {
		console.error('Failed to load Pyodide module:', error);
		throw error;
	}
}
async function initializePyodideInWorker() {
	try {
		const pyodideModule = await loadPyodideModule();

		pyodide = await pyodideModule.loadPyodide({
			indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
			/** @param {string} msg */
			stderr: (msg) => console.error('Python Error:', msg)
		});

		await pyodide.loadPackage('pandas');

		self.postMessage({
			type: 'PYODIDE_READY',
			taskId: 'init'
		});
	} catch (error) {
		console.error('Pyodide initialization error:', error);
		self.postMessage({
			type: 'PYODIDE_ERROR',
			taskId: 'init',
			error: error instanceof Error ? error.message : String(error)
		});
	}
}

// Start initialization immediately
initializePyodideInWorker();

/**
 * @param {ArrayBuffer} arrayBuffer
 * @param {string} fileName - Original filename to determine format
 */
async function processSasFile(arrayBuffer, fileName) {
	if (!pyodide) {
		throw new Error('Pyodide not initialized');
	}

	// Determine file extension for proper format detection
	const isXpt = fileName.toLowerCase().endsWith('.xpt');
	const extension = isXpt ? '.xpt' : '.sas7bdat';
	const tempFile = `/tmpfile${extension}`;
	const format = isXpt ? 'xport' : 'sas7bdat';

	try {
		// Write the input file to Pyodide's virtual filesystem
		const uint8Array = new Uint8Array(arrayBuffer);
		pyodide.FS.writeFile(tempFile, uint8Array);

		const result = await pyodide.runPythonAsync(`
            import pandas as pd
            import json
            import numpy as np

            def convert_bytes(obj):
                if isinstance(obj, bytes):
                    return obj.decode('utf-8', errors='ignore')
                if isinstance(obj, (np.integer, int)):
                    return int(obj)
                if isinstance(obj, (np.floating, float)):
                    return float(obj)
                if isinstance(obj, pd.Timestamp):
                    return obj.isoformat()
                if pd.isna(obj):
                    return None
                raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

            try:
                df = pd.read_sas('${tempFile}', format='${format}')

                # Decode bytes columns upfront (avoids per-value convert_bytes calls)
                for col in df.select_dtypes(include=['object']).columns:
                    df[col] = df[col].apply(
                        lambda x: x.decode('utf-8', errors='ignore') if isinstance(x, bytes) else x
                    )

                # Batch int32 conversion in one operation (avoids DataFrame fragmentation)
                int32_cols = df.select_dtypes(include=['int32']).columns.tolist()
                if int32_cols:
                    df = df.astype({col: int for col in int32_cols})

                details = {
                    'num_rows': int(df.shape[0]),
                    'num_columns': int(df.shape[1]),
                    'columns': df.columns.tolist(),
                    'dtypes': df.dtypes.astype(str).to_dict()
                }

                # to_json handles NaN->null natively, no need for df.where()
                json_data = df.to_json(orient='records', date_format='iso',
                                     default_handler=convert_bytes)

                # Return details dict + data as JSON string (single parse in JS)
                result = json.dumps({'details': details, 'data': json_data},
                                  default=convert_bytes)
            except Exception as e:
                result = json.dumps({'error': str(e)})

            result
        `);

		// Parse the JSON string we got from Python
		const parsedResult = JSON.parse(result);

		if (parsedResult.error) {
			throw new Error(parsedResult.error);
		}

		// Parse the nested data JSON string
		parsedResult.data = JSON.parse(parsedResult.data);

		return parsedResult;
	} catch (error) {
		console.error('Processing error:', error);
		throw error;
	} finally {
		// Clean up the temporary file
		try {
			pyodide.FS.unlink(tempFile);
		} catch (cleanupError) {
			console.warn('Cleanup error:', cleanupError);
		}
	}
}

// Handle messages from the main thread
self.onmessage = async (e) => {
	const { type, taskId, file, fileName } = e.data;

	if (type === 'PROCESS_FILE') {
		const startTime = performance.now();

		try {
			const result = await processSasFile(file, fileName);
			const processingTime = (performance.now() - startTime) / 1000;

			self.postMessage({
				type: 'PROCESSING_COMPLETE',
				taskId,
				result: {
					...result,
					processingTime
				}
			});
		} catch (error) {
			self.postMessage({
				type: 'PROCESSING_ERROR',
				taskId,
				error: error instanceof Error ? error.message : String(error),
				processingTime: (performance.now() - startTime) / 1000
			});
		}
	}
};
