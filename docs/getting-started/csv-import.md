# CSV Import

> Import identity and group data from CSV files with AI-powered column detection.

## Prerequisites

- Identity Radar installed and running
- Admin or IAM Admin role
- A CSV file with identity data (UTF-8 encoded, headers in row 1)

## Step 1: Open the Import Flow

Navigate to **Integrations** and click **Connect New Source > CSV Import**, or drag a CSV file directly onto the Integrations page.

## Step 2: Upload Your CSV

Drag and drop your CSV file onto the upload area, or click to browse and select the file.

Supported file size: up to 50 MB. For larger datasets, split the file and import in batches.

## Step 3: AI Column Detection

Identity Radar automatically analyzes your CSV headers and sample data to detect the format. The system recognizes common exports from:

- Active Directory PowerShell (`Get-ADUser`)
- Azure AD exports
- Generic identity CSV formats

Each detected column shows a confidence percentage:

| Confidence | Meaning |
|-----------|---------|
| 80-100% | High confidence, auto-mapped |
| 50-79% | Medium confidence, review recommended |
| Below 50% | Low confidence, manual mapping needed |

## Step 4: Review and Adjust Mapping

The mapping preview table shows:

- **Source Column**: The header from your CSV
- **Sample Value**: A non-empty value from the first few rows
- **Target Field**: The Identity Radar field this column maps to
- **Confidence**: How certain the AI is about the mapping

Use the dropdown in the Target Field column to correct any misdetected mappings. A **Display Name** mapping is required.

## Step 5: Confirm and Import

Click **Confirm & Import**. The system:

1. Validates all rows against the schema
2. Resolves identities that may already exist (by UPN, email, or SAM account name)
3. Creates new identity records for unmatched rows
4. Calculates initial risk scores

## Step 6: Review Import Results

After import, you will see a summary:

- Total rows processed
- New identities created
- Existing identities updated
- Rows skipped (with reasons)

## Verification

- Navigate to **Identities** and verify imported records appear
- Check that mapped fields (department, tier, status) are populated correctly
- Risk scores are calculated for all imported identities

## Troubleshooting

| Problem | Solution |
|---------|----------|
| File rejected | Ensure the file is valid UTF-8 CSV with headers in the first row |
| All columns unmapped | The CSV format is not recognized. Map columns manually. |
| Display Name required error | At least one column must map to Display Name |
| Duplicate records | The system de-duplicates by UPN and email. Duplicates are updated, not created twice. |
| Date parsing errors | Use ISO 8601 format (YYYY-MM-DD) or common formats (MM/DD/YYYY). |

## Next Steps

- [Your First 15 Minutes](./first-15-minutes.md)
- [Identities Explorer](../user-guide/identities.md)
- [CSV Format Reference](../reference/csv-formats.md)
