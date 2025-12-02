# Prompt Customization Guide

This document explains how to customize prompts for the Tableau Summarizer Extension.

## File Structure

```
backend/
├── app.py              # Main FastAPI application
└── prompts.py          # Prompt building logic
```

## Main Functions

### `build_summarization_prompt(sheets_data, metadata, user_context)`

Main function that constructs the complete prompt sent to Gemini.

**Parameters:**
- `sheets_data`: List of sheet dictionaries with columns and data
- `metadata`: Dashboard metadata (name, filters)
- `user_context`: Optional business context from user

**Returns:** Complete formatted prompt string

**Example:**
```python
from prompts import build_summarization_prompt

prompt = build_summarization_prompt(
    sheets_data=[{
        'name': 'Sales',
        'columns': ['Product', 'Revenue'],
        'data': [{'Product': 'A', 'Revenue': 1000}]
    }],
    metadata={
        'dashboard_name': 'Q4 Sales',
        'filters': [{'field': 'Region', 'value': 'West'}]
    },
    user_context='Focus on top performers'
)
```

## Helper Functions

### `get_system_instruction()`

Returns the base system instruction that defines AI behavior.

**Customize this to:**
- Change AI persona (analyst, strategist, technical expert)
- Modify focus areas
- Adjust output format

**Example:**
```python
def get_system_instruction():
    return """You are a CFO's strategic advisor. 
    Focus on financial implications and ROI..."""
```

### `format_sheet_data(sheet, max_rows=20)`

Formats a single sheet's data for the prompt.

**Parameters:**
- `sheet`: Sheet dictionary
- `max_rows`: Maximum rows to include (default: 20)

**Customize to:**
- Change sample size
- Add statistical summaries
- Filter specific columns

### `format_markdown_table(columns, rows)`

Formats data as a markdown table.

**Customize to:**
- Add formatting (bold, italic)
- Include totals/subtotals
- Highlight outliers

## Available Functions

### Core Functions

- `build_summarization_prompt()` - Main prompt builder
- `get_system_instruction()` - AI persona and behavior definition
- `format_sheet_data()` - Formats individual sheet data
- `format_markdown_table()` - Creates markdown tables

## Customization Examples

### Example 1: Add Industry-Specific Context

Edit `get_system_instruction()`:

```python
def get_system_instruction():
    return """You are a retail analytics expert. 
    Analyze the data with focus on:
    - Customer behavior patterns
    - Inventory turnover
    - Store performance metrics
    - Seasonal trends
    
    Provide actionable recommendations for retail operations."""
```

### Example 2: Change Output Format

```python
def get_system_instruction():
    return """Provide your analysis in this exact format:

    ## Executive Summary
    [2-3 sentence overview]

    ## Key Findings
    1. [Finding with number]
    2. [Finding with number]
    3. [Finding with number]

    ## Recommendations
    - [Action item 1]
    - [Action item 2]
    
    ## Risks
    - [Risk 1]
    - [Risk 2]"""
```

### Example 3: Include Statistical Analysis

```python
def format_sheet_data(sheet, max_rows=20):
    parts = []
    
    # ... existing code ...
    
    # Add statistical summary
    if rows:
        parts.append("\n### Statistical Summary:")
        # Add mean, median, std dev calculations here
        parts.append(f"Row count: {len(rows)}")
        parts.append(f"Columns: {len(columns)}")
    
    return "\n".join(parts)
```

### Example 4: Adjust Sample Size

```python
def format_sheet_data(sheet, max_rows=50):  # Increase from default 20
    # ... rest of function
```

## Advanced Techniques

### 1. Dynamic Sample Size

Adjust sample size based on data volume:

```python
def format_sheet_data(sheet, max_rows=20):
    rows = sheet.get('data', [])
    
    # Use larger sample for small datasets
    if len(rows) < 50:
        sample_size = len(rows)
    elif len(rows) < 500:
        sample_size = 50
    else:
        sample_size = max_rows
    
    # ... rest of formatting
```

### 2. Add Statistical Summaries

```python
def format_sheet_data(sheet, max_rows=20):
    parts = []
    rows = sheet.get('data', [])
    
    # ... existing code ...
    
    # Add simple statistics
    if rows:
        parts.append(f"\nTotal Rows: {len(rows)}")
        # Add more stats as needed
    
    return "\n".join(parts)
```

## Best Practices

### Token Management

```python
# Keep prompts under 8000 tokens for optimal performance
DEFAULT_MAX_ROWS = 20  # Adjust in prompts.py
```

### Clear Instructions

✅ **Good:**
```python
"Provide exactly 5 key insights, each with:
1. A clear statement
2. Supporting data point
3. Recommended action"
```

❌ **Bad:**
```python
"Analyze the data and provide insights"
```

### Consistent Formatting

Use markdown formatting consistently:
- `##` for main sections
- `###` for subsections
- `-` or `•` for bullet points
- `**bold**` for emphasis
- Tables for structured data

### Error Handling

```python
def build_summarization_prompt(sheets_data, metadata, user_context):
    # Validate inputs
    if not sheets_data:
        return "No data provided for analysis."
    
    # Handle missing metadata
    metadata = metadata or {'dashboard_name': 'Unknown Dashboard'}
    
    # Handle empty context
    user_context = user_context or ''
    
    # ... build prompt
```

## Testing Prompts

Use the test endpoint to iterate:

```bash
curl -X POST http://localhost:8000/api/test-prompt \
  -H "Content-Type: application/json" \
  -d @sample_data.json
```

This returns the generated prompt without calling Gemini API.

## Configuration

Edit constants in `prompts.py`:

```python
# Adjust sample size based on your needs
DEFAULT_MAX_ROWS = 20  # Number of rows to include in prompt
```

## Monitoring Prompt Performance

Track these metrics:
- Average prompt length (tokens)
- Response quality scores
- User feedback on summaries
- API costs per prompt type

## Resources

- [Gemini Prompt Design](https://ai.google.dev/docs/prompt_best_practices)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/learn/prompts/introduction-prompt-design)

## Support

For prompt-related issues:
1. Test with `/api/test-prompt` endpoint
2. Check prompt length (should be < 8000 tokens)
3. Validate data formatting
4. Review Gemini API error messages

