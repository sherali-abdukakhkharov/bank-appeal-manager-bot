function getCallerInfo(): string {
    // CRITICAL: This function must NEVER throw an error
    // If it fails, queries must still execute with 'unknown' source
    try {
        // Safely get stack trace with multiple fallbacks
        let stack;
        try {
            const err = new Error();
            stack = err.stack?.split('\n');
        } catch (stackError) {
            return 'unknown';
        }

        // Handle empty or invalid stack
        if (!stack || !Array.isArray(stack) || stack.length === 0) {
            return 'unknown';
        }

        // Try to find application code in the stack
        for (let i = 0; i < stack.length; i++) {
            try {
                const line = stack[i];

                // Skip null/undefined/invalid lines
                if (!line || typeof line !== 'string') {
                    continue;
                }

                // Skip internal calls and node_modules but keep our app files
                if (
                    line.includes('node_modules') ||
                    line.includes('database.service.ts') ||
                    line.includes('database.service.js') ||
                    line.includes('query-interceptor.ts') ||
                    line.includes('query-interceptor.js') ||
                    line.includes('node:internal') ||
                    line.includes('node:events') ||
                    line.includes('node:async_hooks')
                ) {
                    continue;
                }

                // Match pattern: at FunctionName (path/to/file.ts:line:col)
                // or: at ClassName.methodName (path/to/file.ts:line:col)
                // Support both Unix (/) and Windows (\) path separators
                // Match both src/ (development) and dist/ (production) paths
                const match = line.match(
                    /at\s+(?:(\w+(?:\.\w+)?)\s+)?\(?.*[/\\](?:src|dist)[/\\](.*?\.(?:ts|js)):(\d+):\d+\)?/,
                );

                if (match && match.length >= 3) {
                    const functionName = match[1] || '';
                    const relativePath = match[2] || ''; // This is already relative from /src/
                    const lineNum = match[3] || '0';

                    // Validate we have required data
                    if (!relativePath) {
                        continue;
                    }

                    // Normalize path separators to forward slashes for consistency
                    const normalizedPath = relativePath.replace(/\\/g, '/');

                    // Format: repo/file.repo.ts:FunctionName:LineNumber
                    if (functionName) {
                        return `${normalizedPath}:${functionName}:${lineNum}`;
                    }

                    return `${normalizedPath}:${lineNum}`;
                }
            } catch (lineError) {}
        }

        return 'async-query';
    } catch (error) {
        // NEVER throw - silently return unknown on any error
        return 'unknown';
    }
}

export function attachQueryInterceptor(knexInstance: any, label: string) {
    try {
        // Validate inputs
        if (!knexInstance || typeof knexInstance.on !== 'function') {
            console.warn(`Invalid knex instance for label: ${label}`);
            return;
        }

        // Check if query logging is enabled via environment variable
        // Set ENABLE_QUERY_LOG=true in .env to enable detailed query logging
        const isQueryLogEnabled = process.env.ENABLE_QUERY_LOG === 'true';
        const isVerboseLog = process.env.QUERY_LOG_VERBOSE === 'true'; // Show bindings

        // Extract database connection info
        let dbInfo = label;
        try {
            const config = knexInstance.client?.config?.connection;
            if (config) {
                const host = config.host || 'unknown';
                const port = config.port || 'unknown';
                dbInfo = `${host}:${port}`;
            }
        } catch (configError) {
            // If config extraction fails, fall back to label
            dbInfo = label;
        }

        // Wrap knex methods to capture caller info when query is built
        // Note: We don't wrap 'raw' to avoid interfering with raw query bindings
        const methodsToWrap = ['select', 'insert', 'update', 'delete', 'del', 'from', 'table', 'into'];
        methodsToWrap.forEach((method) => {
            try {
                const original = knexInstance[method];
                if (typeof original === 'function') {
                    knexInstance[method] = function (...args: any[]) {
                        try {
                            const builder = original.apply(this, args);
                            // Try to capture caller info, but never fail the query
                            try {
                                if (builder && typeof builder === 'object') {
                                    builder._sqlSource = getCallerInfo();
                                }
                            } catch (sourceError) {
                                // Silently ignore - query must proceed
                            }
                            return builder;
                        } catch (builderError) {
                            // If wrapped method fails, call original directly
                            return original.apply(this, args);
                        }
                    };
                }
            } catch (wrapError) {
                // If wrapping fails, silently ignore and keep original method
                console.warn(`Failed to wrap method ${method} for label ${label}:`, wrapError);
            }
        });

        // Also wrap the knex() function itself (for knex(tableName) calls)
        try {
            const originalKnex = knexInstance.queryBuilder ? knexInstance.queryBuilder.bind(knexInstance) : null;
            if (originalKnex) {
                knexInstance.queryBuilder = function (...args: any[]) {
                    try {
                        const builder = originalKnex.apply(this, args);
                        try {
                            if (builder && typeof builder === 'object') {
                                builder._sqlSource = getCallerInfo();
                            }
                        } catch (sourceError) {
                            // Silently ignore
                        }
                        return builder;
                    } catch (builderError) {
                        return originalKnex.apply(this, args);
                    }
                };
            }
        } catch (wrapError) {
            // Silently ignore
        }

        // ✅ FIX: Use 'query' event for logging without modifying anything
        // This logs query info WITHOUT interfering with SQL generation or parameter binding
        // Only log if explicitly enabled via environment variable
        if (isQueryLogEnabled) {
            knexInstance.on('query', (queryData: any) => {
                try {
                    // Get source info if available (from our method wrapping)
                    let caller = 'no-source';
                    try {
                        if (queryData.__knexQueryUid && queryData.__knexTxId) {
                            // Try to get caller from stored metadata
                            caller = (queryData as any)._sqlSource || 'no-source';
                        }
                    } catch {
                        // Fallback
                    }

                    // Format bindings for logging (only if verbose mode is enabled)
                    let bindingsStr = '';
                    if (
                        isVerboseLog &&
                        queryData.bindings &&
                        Array.isArray(queryData.bindings) &&
                        queryData.bindings.length > 0
                    ) {
                        try {
                            const formattedBindings = queryData.bindings
                                .map((binding: any, index: number) => {
                                    let value: string;
                                    if (binding === null) {
                                        value = 'NULL';
                                    } else if (binding === undefined) {
                                        value = 'undefined';
                                    } else if (typeof binding === 'string') {
                                        if (binding.includes('<?xml')) {
                                            value = 'xml file';
                                        } else {
                                            const escaped = binding.replace(/'/g, "''");
                                            value =
                                                escaped.length > 50
                                                    ? `'${escaped.substring(0, 50)}...'`
                                                    : `'${escaped}'`;
                                        }
                                    } else if (typeof binding === 'number') {
                                        value = binding.toString();
                                    } else if (typeof binding === 'boolean') {
                                        value = binding.toString();
                                    } else if (typeof binding === 'object') {
                                        const jsonStr = JSON.stringify(binding);
                                        value =
                                            jsonStr.length > 50 ? `'${jsonStr.substring(0, 50)}...'` : `'${jsonStr}'`;
                                    } else {
                                        value = String(binding);
                                    }
                                    return `${index + 1} = ${value}`;
                                })
                                .join(', ');
                            bindingsStr = ` bindings: [${formattedBindings}]`;
                        } catch {
                            // If binding formatting fails, just skip it
                            bindingsStr = '';
                        }
                    }

                    // Log query info (this doesn't modify the query, just logs it)
                    console.log(`/* ~~> src:${caller} db:${dbInfo}${bindingsStr} ~~] */ ${queryData.sql}`);
                } catch (error) {
                    // Silently ignore logging errors - query execution is priority
                    console.warn('Query logging error:', error);
                }
            });
        }
    } catch (interceptorError) {
        // CRITICAL: If entire interceptor setup fails, application must continue
        // Queries will work without tracing - tracing is optional, not required
        console.error('Failed to attach query interceptor:', interceptorError);
    }
}
