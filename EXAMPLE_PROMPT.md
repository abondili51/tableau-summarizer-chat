# Example Gemini Prompt

This document shows the actual prompt sent to Google Gemini when generating a dashboard summary.

## Sample Input Data

```json
{
  "sheets_data": [
    {
      "name": "Sales Overview",
      "columns": ["Region", "Product", "Sales", "Profit", "Quantity"],
      "data": [
        {"Region": "East", "Product": "Technology", "Sales": 45000, "Profit": 12000, "Quantity": 150},
        {"Region": "East", "Product": "Furniture", "Sales": 32000, "Profit": 6000, "Quantity": 85},
        {"Region": "West", "Product": "Technology", "Sales": 58000, "Profit": 18000, "Profit": 200},
        {"Region": "West", "Product": "Office Supplies", "Sales": 23000, "Profit": 5500, "Quantity": 320},
        {"Region": "Central", "Product": "Technology", "Sales": 41000, "Profit": 11000, "Quantity": 145}
      ],
      "totalRows": 5
    }
  ],
  "metadata": {
    "dashboard_name": "Q4 Sales Performance",
    "filters": [
      {"field": "Year", "value": "2024", "type": "categorical"},
      {"field": "Quarter", "value": "Q4", "type": "categorical"}
    ]
  },
  "context": "Focus on regional performance differences and identify top-performing product categories. Provide recommendations for Q1 2025 strategy."
}
```

## Generated Prompt

```
You are an expert business intelligence analyst. Analyze the following Tableau dashboard data and provide a concise, actionable summary for business users.

Focus on:
- Key trends and patterns in the data
- Notable insights or anomalies
- Business implications
- Recommended actions

Format your response as clear, bullet-pointed insights. Be concise and business-friendly.

## Dashboard Context
Dashboard: Q4 Sales Performance

### Active Filters:
- Year: 2024
- Quarter: Q4

### Business Context:
Focus on regional performance differences and identify top-performing product categories. Provide recommendations for Q1 2025 strategy.

## Data from Selected Sheets:

### Sheet: Sales Overview
Columns: Region, Product, Sales, Profit, Quantity
Row Count: 5

Sample Data:
| Region | Product | Sales | Profit | Quantity |
|---|---|---|---|---|
| East | Technology | 45000 | 12000 | 150 |
| East | Furniture | 32000 | 6000 | 85 |
| West | Technology | 58000 | 18000 | 200 |
| West | Office Supplies | 23000 | 5500 | 320 |
| Central | Technology | 41000 | 11000 | 145 |

(Showing 5 of 5 rows)

## Summary Request:
Provide a comprehensive business summary of this dashboard data with key insights and recommendations.
```

## Expected Response Format

```markdown
## Q4 2024 Sales Performance Summary

### Key Insights

- **Regional Performance**: West region leads in total sales ($81K), showing 29% higher performance than East ($77K) and 98% higher than Central ($41K)
  
- **Product Category Excellence**: Technology dominates across all regions with $144K in total sales (72% of portfolio) and consistently strong profit margins (26-31%)

- **Profit Efficiency**: Technology maintains the highest profit ratio (26.7% average), while Furniture shows lower margins (18.8%), suggesting potential pricing or cost issues

- **Volume vs Value**: Office Supplies shows interesting dynamics - highest quantity (320 units) but lower total sales, indicating lower price points

### Regional Analysis

- **West Region Strengths**:
  - Highest sales performance
  - Strong Technology penetration (200 units)
  - Diversified portfolio with Office Supplies contributing

- **East Region Opportunities**:
  - Furniture performance needs attention (only 85 units)
  - Technology sales solid but room for growth

- **Central Region Concerns**:
  - Only Technology represented in dataset
  - Significantly lower sales suggests market penetration issues
  - Potential for product diversification

### Business Implications

- Technology category is the clear profit driver and should be prioritized
- Regional disparities indicate potential market-specific strategies needed
- Furniture margins require investigation for profitability improvement

### Q1 2025 Strategic Recommendations

1. **Expand Technology in Central**: Leverage proven Technology success model from West to boost Central region performance

2. **Investigate Furniture Profitability**: Deep dive into East Furniture costs/pricing to improve 18.8% margin closer to Technology levels

3. **Office Supplies Opportunity**: West shows promise with high volume - consider expanding to East and Central with optimized pricing

4. **Regional Best Practices**: Document and replicate West region's success factors across other territories

5. **Product Mix Optimization**: Central region needs immediate product diversification to reduce single-category dependency

### Key Metrics to Monitor

- Technology sales growth trajectory in Central (+target: 40% increase)
- Furniture profit margin improvement in East (+target: 23-25%)
- Office Supplies rollout effectiveness in new regions
- Overall regional sales balance (reduce 98% gap between West and Central)
```

## Customization Examples

### Example 1: Executive Focus

**User Context Input**:
```
Prepare this summary for C-level executives. Focus on strategic opportunities and ROI implications. Keep technical details minimal.
```

### Example 2: Operational Focus

**User Context Input**:
```
This is for the operations team. Emphasize inventory, logistics, and supply chain considerations based on the data patterns.
```

### Example 3: Sales Team Focus

**User Context Input**:
```
Tailor insights for regional sales managers. Highlight actionable tactics they can implement immediately to close the quarter strong.
```

### Example 4: Product Team Focus

**User Context Input**:
```
Product development perspective needed. Which product categories show growth potential? What gaps exist in our portfolio?
```

## Prompt Customization in Code

The prompt is generated in `backend/app.py` by the `build_summarization_prompt()` function.

To customize the prompt template, modify this section:

```python
# System instruction
prompt_parts.append("""You are an expert business intelligence analyst. Analyze the following Tableau dashboard data and provide a concise, actionable summary for business users.

Focus on:
- Key trends and patterns in the data
- Notable insights or anomalies
- Business implications
- Recommended actions

Format your response as clear, bullet-pointed insights. Be concise and business-friendly.""")
```

## Advanced Prompt Engineering Tips

1. **Be Specific About Format**:
   - Request markdown formatting
   - Specify section structure
   - Define bullet point style

2. **Set Tone and Audience**:
   - "For executives..." vs "For analysts..."
   - Technical depth level
   - Formality level

3. **Constrain Length**:
   - "Limit to 500 words"
   - "Provide 3-5 key insights only"
   - "One paragraph per category"

4. **Request Specific Analysis Types**:
   - Trend analysis
   - Comparative analysis
   - Predictive insights
   - Root cause analysis

5. **Include Examples**:
   - Show desired output format
   - Provide sample insights
   - Demonstrate depth expected

## Testing Your Prompts

Use the test endpoint to see generated prompts without consuming Gemini API credits:

```bash
curl -X POST http://localhost:5000/api/test-prompt \
  -H "Content-Type: application/json" \
  -d @sample_request.json

# Returns the full prompt that would be sent to Gemini
```

This helps iterate on prompt design before committing to API calls.

