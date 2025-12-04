/**
 * Tableau Extensions API Connector
 * Handles all interactions with Tableau dashboards
 */

let tableau = null;
let dashboard = null;

/**
 * Initialize the Tableau Extensions API
 * Must be called before any other Tableau operations
 */
export async function initializeTableau() {
  return new Promise((resolve, reject) => {
    console.log('Starting Tableau initialization...');
    console.log('window.tableau:', typeof window.tableau);
    
    if (typeof window.tableau === 'undefined') {
      console.error('Tableau Extensions API not loaded - check if script is included in HTML');
      reject(new Error('Tableau Extensions API not loaded'));
      return;
    }

    tableau = window.tableau;
    console.log('Tableau object found, initializing...');
    
    tableau.extensions.initializeAsync().then(() => {
      dashboard = tableau.extensions.dashboardContent.dashboard;
      console.log('Tableau Extensions API initialized successfully');
      console.log('Dashboard name:', dashboard.name);
      console.log('Dashboard worksheets count:', dashboard.worksheets.length);
      resolve();
    }).catch((error) => {
      console.error('Error initializing Tableau Extensions API:', error);
      console.error('Error details:', error.message, error.stack);
      reject(error);
    });
  });
}

/**
 * Get all worksheets in the current dashboard
 * Returns array of sheet names
 */
export async function getSheets() {
  if (!dashboard) {
    throw new Error('Tableau not initialized');
  }

  const worksheets = dashboard.worksheets;
  console.log('Dashboard worksheets:', worksheets);
  console.log('Number of worksheets:', worksheets ? worksheets.length : 0);
  
  if (!worksheets || worksheets.length === 0) {
    console.warn('No worksheets found in dashboard. Make sure this extension is placed on a dashboard with worksheets.');
    return [];
  }
  
  return worksheets.map(sheet => sheet.name);
}

/**
 * Extract data from a specific worksheet
 * Returns structured data with columns and rows
 */
export async function extractSheetData(sheetName, maxRows = 1000) {
  if (!dashboard) {
    throw new Error('Tableau not initialized');
  }

  try {
    // Find the worksheet by name
    const worksheet = dashboard.worksheets.find(ws => ws.name === sheetName);
    if (!worksheet) {
      throw new Error(`Worksheet '${sheetName}' not found`);
    }

    // Get underlying data
    const dataTable = await worksheet.getSummaryDataAsync({
      maxRows: maxRows,
      ignoreAliases: false,
      ignoreSelection: false
    });

    // Extract column information
    const columns = dataTable.columns.map(col => ({
      name: col.fieldName,
      dataType: col.dataType,
      index: col.index
    }));

    // Extract row data
    const rows = dataTable.data.map(row => {
      const rowData = {};
      columns.forEach(col => {
        const value = row[col.index].value;
        rowData[col.name] = value;
      });
      return rowData;
    });

    return {
      name: sheetName,
      columns: columns.map(c => c.name),
      data: rows,
      totalRows: dataTable.totalRowCount,
      isSummaryData: dataTable.isSummaryData
    };
  } catch (error) {
    console.error(`Error extracting data from sheet '${sheetName}':`, error);
    throw error;
  }
}

/**
 * Get dashboard metadata including filters, title, etc.
 */
export async function getDashboardMetadata() {
  if (!dashboard) {
    throw new Error('Tableau not initialized');
  }

  try {
    const metadata = {
      dashboard_name: dashboard.name || 'Untitled Dashboard',
      filters: []
    };

    // Get filters from all worksheets
    const worksheets = dashboard.worksheets;
    for (const worksheet of worksheets) {
      try {
        const filters = await worksheet.getFiltersAsync();
        
        for (const filter of filters) {
          const filterInfo = {
            worksheet: worksheet.name,
            field: filter.fieldName,
            type: filter.filterType,
            value: null
          };

          // Extract filter values based on type
          switch (filter.filterType) {
            case 'categorical':
              filterInfo.value = filter.appliedValues.map(v => v.value).join(', ');
              break;
            case 'range':
              filterInfo.value = `${filter.minValue} to ${filter.maxValue}`;
              break;
            case 'relative-date':
              filterInfo.value = `${filter.periodType} (${filter.rangeN} ${filter.rangeType})`;
              break;
            default:
              filterInfo.value = 'Active';
          }

          metadata.filters.push(filterInfo);
        }
      } catch (err) {
        console.warn(`Could not get filters for worksheet ${worksheet.name}:`, err);
      }
    }

    return metadata;
  } catch (error) {
    console.error('Error getting dashboard metadata:', error);
    throw error;
  }
}

/**
 * Get comprehensive datasource metadata for all datasources in the dashboard
 * Includes field definitions, aliases, descriptions, connection info, etc.
 */
export async function getDatasourceMetadata() {
  if (!dashboard) {
    throw new Error('Tableau not initialized');
  }

  try {
    const datasourcesMap = new Map();
    const worksheets = dashboard.worksheets;

    // Iterate through all worksheets to collect unique datasources
    for (const worksheet of worksheets) {
      try {
        const datasources = await worksheet.getDataSourcesAsync();
        
        for (const datasource of datasources) {
          // Skip if we've already processed this datasource
          if (datasourcesMap.has(datasource.id)) {
            continue;
          }

          const datasourceInfo = {
            id: datasource.id,
            name: datasource.name,
            connectionName: datasource.connectionName || 'N/A',
            isExtract: datasource.isExtract,
            extractUpdateTime: datasource.extractUpdateTime || null,
            fields: []
          };

          // Get all fields from the datasource
          try {
            const fields = await datasource.getFieldsAsync();
            
            for (const field of fields) {
              const fieldInfo = {
                id: field.id,
                name: field.name,
                description: field.description || '',
                role: field.role, // 'dimension' or 'measure'
                dataType: field.dataType, // 'string', 'int', 'float', 'date', etc.
                aggregation: field.aggregation || 'none',
                isHidden: field.isHidden || false,
                isCombinedField: field.isCombinedField || false,
                isGenerated: field.isGenerated || false
              };

              datasourceInfo.fields.push(fieldInfo);
            }
          } catch (err) {
            console.warn(`Could not get fields for datasource ${datasource.name}:`, err);
          }

          // Get active tables if available (for relationship/join info)
          try {
            if (datasource.getActiveTablesAsync) {
              const activeTables = await datasource.getActiveTablesAsync();
              datasourceInfo.tables = activeTables.map(table => ({
                id: table.id,
                name: table.name
              }));
            }
          } catch (err) {
            // getActiveTablesAsync might not be available in all Tableau versions
            console.debug(`Could not get active tables for datasource ${datasource.name}:`, err);
          }

          datasourcesMap.set(datasource.id, datasourceInfo);
        }
      } catch (err) {
        console.warn(`Could not get datasources for worksheet ${worksheet.name}:`, err);
      }
    }

    // Convert map to array
    return Array.from(datasourcesMap.values());
  } catch (error) {
    console.error('Error getting datasource metadata:', error);
    throw error;
  }
}

/**
 * Subscribe to filter change events across all worksheets
 * Returns unsubscribe function
 */
export function subscribeToFilterChanges(callback) {
  if (!dashboard) {
    console.warn('Tableau not initialized, cannot subscribe to filter changes');
    return null;
  }

  const unsubscribeFunctions = [];

  try {
    const worksheets = dashboard.worksheets;
    
    worksheets.forEach(worksheet => {
      try {
        const unsubscribe = worksheet.addEventListener(
          tableau.TableauEventType.FilterChanged,
          (event) => {
            console.log(`Filter changed in worksheet: ${worksheet.name}`);
            callback(event);
          }
        );
        unsubscribeFunctions.push(unsubscribe);
      } catch (err) {
        console.warn(`Could not subscribe to filter changes for ${worksheet.name}:`, err);
      }
    });

    // Return combined unsubscribe function
    return () => {
      unsubscribeFunctions.forEach(unsub => {
        try {
          unsub();
        } catch (err) {
          console.warn('Error unsubscribing from filter changes:', err);
        }
      });
    };
  } catch (error) {
    console.error('Error subscribing to filter changes:', error);
    return null;
  }
}

/**
 * Subscribe to parameter change events
 * Returns unsubscribe function
 */
export function subscribeToParameterChanges(callback) {
  if (!dashboard) {
    console.warn('Tableau not initialized, cannot subscribe to parameter changes');
    return null;
  }

  try {
    const unsubscribe = dashboard.addEventListener(
      tableau.TableauEventType.ParameterChanged,
      (event) => {
        console.log('Parameter changed:', event);
        callback(event);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to parameter changes:', error);
    return null;
  }
}

/**
 * Get current dashboard size
 */
export function getDashboardSize() {
  if (!dashboard) {
    return { width: 0, height: 0 };
  }

  return {
    width: dashboard.size.width,
    height: dashboard.size.height
  };
}

/**
 * Save extension settings (for author configuration)
 */
export async function saveSettings(settings) {
  if (!tableau) {
    throw new Error('Tableau not initialized');
  }

  try {
    await tableau.extensions.settings.set('config', JSON.stringify(settings));
    await tableau.extensions.settings.saveAsync();
    console.log('Settings saved successfully');
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

/**
 * Load extension settings
 */
export function loadSettings() {
  if (!tableau) {
    throw new Error('Tableau not initialized');
  }

  try {
    const settingsJson = tableau.extensions.settings.get('config');
    return settingsJson ? JSON.parse(settingsJson) : null;
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
}

/**
 * Get the Tableau Server URL and site information
 * Returns server URL, site content URL, and site ID
 */
export function getTableauServerInfo() {
  if (!tableau) {
    throw new Error('Tableau not initialized');
  }

  try {
    // Get environment information
    const environment = tableau.extensions.environment;
    
    // For Tableau Server/Cloud, tableauServerUrl should be populated
    // For Tableau Desktop, it may be empty, so we return null and let the user enter it manually
    const serverUrl = environment.tableauServerUrl || null;
    
    return {
      serverUrl: serverUrl,
      siteContentUrl: environment.siteContentUrl || '',
      siteId: environment.siteId || '',
      mode: environment.mode, // 'authoring' or 'viewing'
      context: environment.context // 'server', 'desktop', or 'cloud'
    };
  } catch (error) {
    console.error('Error getting Tableau server info:', error);
    return {
      serverUrl: null,
      siteContentUrl: '',
      siteId: '',
      mode: 'unknown',
      context: 'unknown'
    };
  }
}

/**
 * Get the first datasource ID from the dashboard
 * Useful for chat agent which requires a datasource ID
 */
export async function getPrimaryDatasourceId() {
  if (!dashboard) {
    throw new Error('Tableau not initialized');
  }

  try {
    const worksheets = dashboard.worksheets;
    
    if (!worksheets || worksheets.length === 0) {
      throw new Error('No worksheets found in dashboard');
    }

    // Get datasources from first worksheet
    const datasources = await worksheets[0].getDataSourcesAsync();
    
    if (!datasources || datasources.length === 0) {
      throw new Error('No datasources found');
    }

    return {
      id: datasources[0].id,
      name: datasources[0].name,
      connectionName: datasources[0].connectionName || 'N/A'
    };
  } catch (error) {
    console.error('Error getting primary datasource:', error);
    throw error;
  }
}

/**
 * Get all unique datasource IDs and names from the dashboard
 */
export async function getAllDatasources() {
  if (!dashboard) {
    throw new Error('Tableau not initialized');
  }

  try {
    const datasourcesMap = new Map();
    const worksheets = dashboard.worksheets;

    for (const worksheet of worksheets) {
      try {
        const datasources = await worksheet.getDataSourcesAsync();
        
        for (const datasource of datasources) {
          if (!datasourcesMap.has(datasource.id)) {
            datasourcesMap.set(datasource.id, {
              id: datasource.id,
              name: datasource.name,
              connectionName: datasource.connectionName || 'N/A'
            });
          }
        }
      } catch (err) {
        console.warn(`Could not get datasources for worksheet ${worksheet.name}:`, err);
      }
    }

    return Array.from(datasourcesMap.values());
  } catch (error) {
    console.error('Error getting all datasources:', error);
    throw error;
  }
}

