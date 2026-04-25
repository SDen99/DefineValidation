import type { DatasetJsonProcessingResult, FileValidationResult } from '../types/processing';

/**
 * CDISC Dataset-JSON v1.1 structure
 */
interface DatasetJsonColumn {
	itemOID: string;
	name: string;
	label: string;
	dataType: string;
	length?: number;
	displayFormat?: string;
	keySequence?: number;
	targetDataType?: string;
}

interface DatasetJsonStructure {
	datasetJSONVersion: string;
	datasetJSONCreationDateTime?: string;
	itemGroupOID: string;
	fileOID?: string;
	records: number;
	name: string;
	label: string;
	columns: DatasetJsonColumn[];
	rows?: any[][];
	dbLastModifiedDateTime?: string;
	originator?: string;
	sourceSystem?: {
		name: string;
		version: string;
	};
	studyOID?: string;
	metaDataVersionOID?: string;
	metaDataRef?: string;
}

/**
 * Pure Dataset-JSON data processor - no file I/O, no progress callbacks
 * Processes CDISC Dataset-JSON v1.1 format
 */
export class DatasetJsonProcessor {
	/**
	 * Process Dataset-JSON string and return structured result
	 * @param jsonString - The Dataset-JSON content as string
	 * @returns Promise with processed dataset data
	 */
	async process(jsonString: string): Promise<DatasetJsonProcessingResult> {
		const startTime = performance.now();

		try {
			// Parse JSON
			const json: DatasetJsonStructure = JSON.parse(jsonString);

			// Validate structure
			this.validateStructure(json);

			// Extract metadata
			const columns = json.columns.map(col => col.name);
			const dtypes = this.extractDataTypes(json.columns);

			// Transform rows from array format to object format
			const data = this.transformRows(json.rows || [], json.columns);

			const processingTime = (performance.now() - startTime) / 1000;

			return {
				success: true,
				data,
				metrics: {
					uploadTime: 0, // Will be set by calling layer
					datasetSize: jsonString.length,
					processingTime
				},
				details: {
					columns,
					dtypes,
					num_rows: json.records,
					num_columns: json.columns.length
				},
				metadata: {
					itemGroupOID: json.itemGroupOID,
					datasetName: json.name,
					datasetLabel: json.label,
					version: json.datasetJSONVersion
				},
				processingTime
			};
		} catch (error) {
			console.error('[DatasetJsonProcessor] Processing error:', error);

			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				processingTime: (performance.now() - startTime) / 1000,
				data: [],
				metrics: {
					uploadTime: 0,
					processingTime: (performance.now() - startTime) / 1000,
					datasetSize: jsonString.length
				},
				details: {
					columns: [],
					dtypes: {},
					num_rows: 0,
					num_columns: 0
				}
			};
		}
	}

	/**
	 * Validate Dataset-JSON structure
	 * @param json - Parsed JSON object
	 * @throws Error if structure is invalid
	 */
	private validateStructure(json: any): void {
		// Check required top-level fields
		const requiredFields = [
			'datasetJSONVersion',
			'itemGroupOID',
			'records',
			'name',
			'label',
			'columns'
		];

		for (const field of requiredFields) {
			if (!(field in json)) {
				throw new Error(
					`Invalid Dataset-JSON: missing required field '${field}'. ` +
						`This may not be a CDISC Dataset-JSON file.`
				);
			}
		}

		// Validate columns array
		if (!Array.isArray(json.columns) || json.columns.length === 0) {
			throw new Error('Invalid Dataset-JSON: columns must be a non-empty array');
		}

		// Validate each column has required fields
		for (let i = 0; i < json.columns.length; i++) {
			const col = json.columns[i];
			const requiredColFields = ['itemOID', 'name', 'label', 'dataType'];

			for (const field of requiredColFields) {
				if (!(field in col)) {
					throw new Error(
						`Invalid Dataset-JSON: column at index ${i} missing required field '${field}'`
					);
				}
			}
		}

		// Validate rows if present
		if ('rows' in json && !Array.isArray(json.rows)) {
			throw new Error('Invalid Dataset-JSON: rows must be an array');
		}

		// Validate version format
		if (!/^\d+\.\d+(\.\d+)?$/.test(json.datasetJSONVersion)) {
			console.warn(
				`Dataset-JSON version '${json.datasetJSONVersion}' has unexpected format. Expected format: X.Y or X.Y.Z`
			);
		}
	}

	/**
	 * Validate Dataset-JSON buffer without full processing
	 * @param jsonString - The Dataset-JSON content to validate
	 * @returns Validation result
	 */
	validate(jsonString: string): FileValidationResult {
		if (!jsonString || jsonString.trim().length === 0) {
			return {
				valid: false,
				error: 'Invalid input: Empty JSON string',
				fileType: 'datasetjson'
			};
		}

		try {
			const json = JSON.parse(jsonString);
			this.validateStructure(json);

			return {
				valid: true,
				fileType: 'datasetjson'
			};
		} catch (error) {
			return {
				valid: false,
				error: error instanceof Error ? error.message : String(error),
				fileType: 'datasetjson'
			};
		}
	}

	/**
	 * Transform rows from array format to object format
	 * Dataset-JSON stores rows as arrays of values matching column order
	 * We convert to array of objects for easier data manipulation
	 */
	private transformRows(rows: any[][], columns: DatasetJsonColumn[]): any[] {
		return rows.map((row) => {
			const obj: any = {};
			columns.forEach((col, idx) => {
				obj[col.name] = row[idx];
			});
			return obj;
		});
	}

	/**
	 * Extract data types from columns
	 * Keep original CDISC dataTypes (string, integer, decimal, etc.)
	 */
	private extractDataTypes(columns: DatasetJsonColumn[]): Record<string, string> {
		const dtypes: Record<string, string> = {};
		columns.forEach((col) => {
			dtypes[col.name] = col.dataType; // Use CDISC type directly
		});
		return dtypes;
	}
}

/**
 * Pure function interface for simple Dataset-JSON processing
 * @param jsonString - Dataset-JSON content as string
 * @returns Promise with processing result
 */
export async function processDatasetJson(jsonString: string): Promise<DatasetJsonProcessingResult> {
	const processor = new DatasetJsonProcessor();
	return processor.process(jsonString);
}

/**
 * Pure function for Dataset-JSON validation
 * @param jsonString - Dataset-JSON content to validate
 * @returns Validation result
 */
export function validateDatasetJson(jsonString: string): FileValidationResult {
	const processor = new DatasetJsonProcessor();
	return processor.validate(jsonString);
}
