"""
Prompt Templates for Tableau Summarizer
Contains prompt building logic for Gemini AI summarization
"""

# Configuration
DEFAULT_MAX_ROWS = 50
DEFAULT_MAX_FIELDS = 15


def build_summarization_prompt(sheets_data, metadata, datasources, user_context):
    """
    Constructs the prompt sent to Gemini for summarization
    
    Args:
        sheets_data: List of sheet data objects with rows and columns
        metadata: Dashboard metadata (title, filters, etc.)
        datasources: List of datasource metadata objects with field definitions
        user_context: Optional business context from author
    
    Returns:
        Formatted prompt string
    """
    prompt_parts = []
    
    # System instruction
    prompt_parts.append(get_system_instruction())
    
    # Dashboard metadata
    prompt_parts.append("\n## Dashboard Context")
    prompt_parts.append(f"Dashboard: {metadata.get('dashboard_name', 'N/A')}")
    
    # Active filters
    if metadata.get('filters'):
        prompt_parts.append("\n### Active Filters:")
        for filter_info in metadata['filters']:
            prompt_parts.append(f"- {filter_info['field']}: {filter_info['value']}")
    
    # User-provided context (important - may contain specific formatting instructions)
    if user_context:
        prompt_parts.append("\n### Business Context (IMPORTANT - Follow any instructions provided here):")
        prompt_parts.append(user_context)
    
    # Datasource metadata
    if datasources:
        datasource_section = format_datasource_metadata(datasources)
        prompt_parts.append(datasource_section)
    
    # Sheet data
    prompt_parts.append("\n## Data from Selected Sheets:")
    
    for sheet in sheets_data:
        sheet_section = format_sheet_data(sheet)
        prompt_parts.append(sheet_section)
       
    return "\n".join(prompt_parts)


def get_system_instruction():
    """
    Returns the system instruction for the AI model
    Defines the role, focus areas, and output format
    """
    return """You are a business intelligence analyst. Analyze this Tableau dashboard and provide a concise, actionable summary.

Focus on:
- Key trends and patterns
- Notable insights or anomalies
- Use field definitions and descriptions to provide context-aware interpretations

Format: Follow any instructions in Business Context section, otherwise use clear bullet points. Be concise and business-friendly."""


def format_sheet_data(sheet, max_rows=DEFAULT_MAX_ROWS):
    """
    Formats a single sheet's data for inclusion in the prompt
    
    Args:
        sheet: Sheet data dictionary with name, columns, and data
        max_rows: Maximum number of rows to include in sample
    
    Returns:
        Formatted string with sheet data
    """
    parts = []
    
    sheet_name = sheet.get('name', 'Unknown')
    columns = sheet.get('columns', [])
    rows = sheet.get('data', [])
    
    parts.append(f"\n### Sheet: {sheet_name}")
    parts.append(f"Columns: {', '.join(columns)}")
    parts.append(f"Row Count: {len(rows)}")
    
    # Include sample data (limit for token efficiency)
    if rows and columns:
        parts.append("\nSample Data (CSV format):")
        sample_size = min(max_rows, len(rows))
        
        # Format as compact CSV for faster processing
        table = format_compact_table(columns, rows[:sample_size])
        parts.append(table)
        
        if len(rows) > sample_size:
            parts.append(f"(Showing {sample_size} of {len(rows)} rows)")
    
    return "\n".join(parts)


def format_compact_table(columns, rows):
    """
    Formats data as a compact CSV-style table (faster to generate and process)
    
    Args:
        columns: List of column names
        rows: List of row dictionaries
    
    Returns:
        CSV-formatted table string
    """
    parts = []
    
    # Header row
    parts.append(",".join(columns))
    
    # Data rows
    for row in rows:
        row_values = [str(row.get(col, '')).replace(',', ';') for col in columns]  # Replace commas to avoid CSV issues
        parts.append(",".join(row_values))
    
    return "\n".join(parts)


def format_markdown_table(columns, rows):
    """
    Formats data as a markdown table (kept for backward compatibility)
    
    Args:
        columns: List of column names
        rows: List of row dictionaries
    
    Returns:
        Markdown-formatted table string
    """
    parts = []
    
    # Header row
    parts.append("| " + " | ".join(columns) + " |")
    
    # Separator row
    parts.append("|" + "|".join(["---" for _ in columns]) + "|")
    
    # Data rows
    for row in rows:
        row_values = [str(row.get(col, '')) for col in columns]
        parts.append("| " + " | ".join(row_values) + " |")
    
    return "\n".join(parts)


def format_datasource_metadata(datasources):
    """
    Formats datasource metadata for inclusion in the prompt
    
    Args:
        datasources: List of datasource metadata dictionaries
    
    Returns:
        Formatted string with datasource information
    """
    parts = []
    
    parts.append("\n## Datasource Information")
    parts.append(f"Total Datasources: {len(datasources)}")
    
    for idx, ds in enumerate(datasources, 1):
        parts.append(f"\n### Datasource {idx}: {ds.get('name', 'Unknown')}")
        
        # Connection information
        connection_name = ds.get('connectionName', 'N/A')
        is_extract = ds.get('isExtract', False)
        extract_time = ds.get('extractUpdateTime')
        
        parts.append(f"**Connection:** {connection_name}")
        parts.append(f"**Type:** {'Extract' if is_extract else 'Live Connection'}")
        
        if is_extract and extract_time:
            parts.append(f"**Last Refreshed:** {extract_time}")
        
        # Table information
        tables = ds.get('tables', [])
        if tables:
            table_names = ', '.join([table.get('name', 'Unknown') for table in tables])
            parts.append(f"**Tables:** {table_names}")
        
        # Field definitions
        fields = ds.get('fields', [])
        if fields:
            parts.append(f"\n**Field Definitions ({len(fields)} fields):**")
            
            # Group fields by role
            dimensions = [f for f in fields if f.get('role') == 'dimension' and not f.get('isHidden', False)]
            measures = [f for f in fields if f.get('role') == 'measure' and not f.get('isHidden', False)]
            
            if dimensions:
                parts.append("\n*Dimensions:*")
                for field in dimensions[:DEFAULT_MAX_FIELDS]:
                    field_desc = format_field_info(field)
                    parts.append(f"  - {field_desc}")
                if len(dimensions) > DEFAULT_MAX_FIELDS:
                    parts.append(f"  ... and {len(dimensions) - DEFAULT_MAX_FIELDS} more dimensions")
            
            if measures:
                parts.append("\n*Measures:*")
                for field in measures[:DEFAULT_MAX_FIELDS]:
                    field_desc = format_field_info(field)
                    parts.append(f"  - {field_desc}")
                if len(measures) > DEFAULT_MAX_FIELDS:
                    parts.append(f"  ... and {len(measures) - DEFAULT_MAX_FIELDS} more measures")
    
    return "\n".join(parts)


def format_field_info(field):
    """
    Formats individual field information
    
    Args:
        field: Field metadata dictionary
    
    Returns:
        Formatted string with field details
    """
    name = field.get('name', 'Unknown')
    data_type = field.get('dataType', 'unknown')
    aggregation = field.get('aggregation', 'none')
    description = field.get('description', '')
    is_generated = field.get('isGenerated', False)
    is_combined = field.get('isCombinedField', False)
    
    parts = [f"**{name}**"]
    parts.append(f"({data_type}")
    
    if aggregation and aggregation != 'none':
        parts.append(f", {aggregation}")
    
    if is_generated:
        parts.append(", generated")
    
    if is_combined:
        parts.append(", combined field")
    
    parts.append(")")
    
    if description:
        parts.append(f" - {description}")
    
    return "".join(parts)

