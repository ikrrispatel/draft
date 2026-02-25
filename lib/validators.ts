/* ------------------------------------------------------------------ */
/*  lib/validators.ts — AJV-based schema validation (Draft 2020-12)    */
/* ------------------------------------------------------------------ */

import Ajv2020, { type ErrorObject } from "ajv/dist/2020";

import intakeSchema from "@/schemas/intake.schema.json";
import visionSchema from "@/schemas/vision.schema.json";
import scopeSchema from "@/schemas/scope.schema.json";
import distributionSchema from "@/schemas/distribution.schema.json";
import architectureSchema from "@/schemas/architecture.schema.json";
import qaSchema from "@/schemas/qa.schema.json";
import scoresSchema from "@/schemas/scores.schema.json";
import stateSchema from "@/schemas/state.schema.json";

// ---- Custom error --------------------------------------------------

export class SchemaValidationError extends Error {
    details: ErrorObject[];

    constructor(schemaId: string, errors: ErrorObject[]) {
        const summary = errors
            .map((e) => `${e.instancePath || "/"} ${e.message ?? ""}`.trim())
            .join("; ");
        super(`Schema validation failed for ${schemaId}: ${summary}`);
        this.name = "SchemaValidationError";
        this.details = errors;
    }
}

// ---- AJV instance (draft 2020-12) ---------------------------------

const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateSchema: true,
});

// Add schemas using their $id as the key
const SCHEMAS = [
    intakeSchema,
    visionSchema,
    scopeSchema,
    distributionSchema,
    architectureSchema,
    qaSchema,
    scoresSchema,
    stateSchema,
] as const;

for (const s of SCHEMAS) {
    if (!s.$id) {
        throw new Error("Schema missing $id");
    }
    ajv.addSchema(s, s.$id);
}

// Helper: accept either full $id or short filename id
function resolveSchemaId(schemaId: string): string {
    // If caller passed a full $id, use it
    if (ajv.getSchema(schemaId)) return schemaId;

    // Otherwise try matching by suffix (e.g. "intake.schema.json")
    for (const s of SCHEMAS) {
        if (typeof s.$id === "string" && s.$id.endsWith(schemaId)) return s.$id;
    }

    return schemaId; // fall back (will error nicely below)
}

// ---- Validation helpers --------------------------------------------

function validateOrThrow(schemaId: string, data: unknown): void {
    const resolved = resolveSchemaId(schemaId);
    const validate = ajv.getSchema(resolved);

    if (!validate) {
        throw new Error(`Schema not found: ${schemaId} (resolved: ${resolved})`);
    }

    const valid = validate(data);

    if (!valid) {
        const errors = (validate.errors ?? []) as ErrorObject[];
        throw new SchemaValidationError(schemaId, errors);
    }
}

// ---- Public validators ---------------------------------------------

export function validateIntakeOrThrow(data: unknown): void {
    validateOrThrow("intake.schema.json", data);
}

export function validateVisionOrThrow(data: unknown): void {
    validateOrThrow("vision.schema.json", data);
}

export function validateScopeOrThrow(data: unknown): void {
    validateOrThrow("scope.schema.json", data);
}

export function validateDistributionOrThrow(data: unknown): void {
    validateOrThrow("distribution.schema.json", data);
}

export function validateArchitectureOrThrow(data: unknown): void {
    validateOrThrow("architecture.schema.json", data);
}

export function validateQAOrThrow(data: unknown): void {
    validateOrThrow("qa.schema.json", data);
}

export function validateScoresOrThrow(data: unknown): void {
    validateOrThrow("scores.schema.json", data);
}

// Optional: validate the full shared state if needed later
export function validateStateOrThrow(data: unknown): void {
    validateOrThrow("state.schema.json", data);
}