/**
 * Kimi Search MCP Plugin - 核心逻辑模块
 *
 * 提供搜索和网页获取的核心功能实现
 */

// ==================== 类型定义 ====================

/** 搜索结果条目 */
export interface SearchResult {
  site_name: string;  // 网站名称
  title: string;      // 文章标题
  url: string;        // 网页链接
  snippet: string;    // 内容摘要
  content: string;    // 完整内容（可选）
  date: string;       // 发布日期
  icon: string;       // 网站图标
  mime: string;       // MIME 类型
}

/** 搜索参数 */
export interface SearchParams {
  query: string;              // 搜索关键词
  limit?: number;             // 返回数量限制
  include_content?: boolean;  // 是否包含完整内容
}

/** 网页获取参数 */
export interface FetchParams {
  url: string;  // 目标 URL
}

/** 搜索上下文 */
export interface SearchContext {
  toolCallId: string;   // 工具调用 ID
  userAgent: string;    // User-Agent
  config: {
    baseUrl: string;              // API 地址
    apiKey: string;               // API 密钥
    timeoutSeconds: number;       // 超时时间（秒）
    customHeaders?: Record<string, string>;  // 自定义请求头
  };
}

/** 网页获取上下文 */
export interface FetchContext {
  toolCallId: string;   // 工具调用 ID
  userAgent: string;    // User-Agent
  service?: {
    baseUrl: string;              // 服务地址
    apiKey: string;               // API 密钥
    customHeaders?: Record<string, string>;  // 自定义请求头
  };
}

/** 工具执行结果 */
export interface ToolResult {
  is_error: boolean;  // 是否出错
  output: string;     // 输出内容
  message: string;    // 提示信息
  brief: string;      // 简要说明
}

/** 批量搜索单项 */
export interface BatchSearchItem {
  query: string;              // 搜索关键词
  limit?: number;             // 数量限制
  include_content?: boolean;  // 是否包含完整内容
}

/** 批量搜索参数 */
export interface BatchSearchParams {
  queries: BatchSearchItem[];
}

/** 批量搜索结果 */
export interface BatchSearchResult {
  query: string;      // 查询关键词
  result: ToolResult; // 执行结果
}

/** 批量获取单项 */
export interface BatchFetchItem {
  url: string;  // 目标 URL
}

/** 批量获取参数 */
export interface BatchFetchParams {
  urls: BatchFetchItem[];
}

/** 批量获取结果 */
export interface BatchFetchResult {
  url: string;        // 目标 URL
  result: ToolResult; // 执行结果
}

// ==================== 工具函数 ====================

/**
 * 创建成功的结果对象
 */
function ok(output: string, message: string = "", brief: string = ""): ToolResult {
  return {
    is_error: false,
    output,
    message,
    brief,
  };
}

/**
 * 创建失败的结果对象
 */
function error(message: string, brief: string, output: string = ""): ToolResult {
  return {
    is_error: true,
    output,
    message,
    brief,
  };
}

/**
 * 规范化搜索数量限制
 * @param limit 原始限制值
 * @returns 规范化后的值（1-20，默认10）
 */
function normalizeLimit(limit: unknown): number {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return 10;  // 默认返回10条
  }
  const int = Math.floor(limit);
  return Math.max(1, Math.min(20, int));  // 限制在 1-20 范围内
}

/**
 * 解析搜索 API 响应
 * @param data API 返回的原始数据
 * @returns 解析后的搜索结果数组
 */
function parseSearchResponse(data: unknown): SearchResult[] {
  if (!data || typeof data !== "object") {
    throw new Error("响应数据不是对象");
  }
  const root = data as { search_results?: unknown };
  if (!Array.isArray(root.search_results)) {
    throw new Error("响应中缺少 search_results 字段");
  }
  return root.search_results.map((item: unknown, index: number) => {
    if (!item || typeof item !== "object") {
      throw new Error(`search_results[${index}] 格式无效`);
    }
    const row = item as Record<string, unknown>;
    // 检查必需字段
    const required = ["site_name", "title", "url", "snippet"];
    for (const key of required) {
      if (typeof row[key] !== "string") {
        throw new Error(`search_results[${index}] 缺少 ${key} 字段`);
      }
    }
    return {
      site_name: row.site_name as string,
      title: row.title as string,
      url: row.url as string,
      snippet: row.snippet as string,
      content: typeof row.content === "string" ? row.content : "",
      date: typeof row.date === "string" ? row.date : "",
      icon: typeof row.icon === "string" ? row.icon : "",
      mime: typeof row.mime === "string" ? row.mime : "",
    };
  });
}

// ==================== 搜索功能 ====================

/**
 * 执行单关键词搜索
 * @param params 搜索参数
 * @param ctx 搜索上下文
 * @param fetchLike fetch 函数（用于测试）
 * @returns 搜索结果
 */
export async function executeSearch(
  params: SearchParams,
  ctx: SearchContext,
  fetchLike: typeof fetch = fetch
): Promise<ToolResult> {
  const baseUrl = ctx.config.baseUrl.trim();
  const apiKey = ctx.config.apiKey.trim();

  // 检查配置
  if (!baseUrl || !apiKey) {
    return error(
      "搜索服务未配置。请设置 KIMI_CODE_API_KEY 环境变量。",
      "搜索服务未配置"
    );
  }

  // 设置超时
  const timeoutSeconds = ctx.config.timeoutSeconds ?? 30;
  const timeoutMs = Math.max(1, timeoutSeconds) * 1000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 发送搜索请求
    const response = await fetchLike(baseUrl, {
      method: "POST",
      headers: {
        "User-Agent": ctx.userAgent,
        Authorization: `Bearer ${apiKey}`,
        "X-Msh-Tool-Call-Id": ctx.toolCallId,
        "Content-Type": "application/json",
        ...(ctx.config.customHeaders ?? {}),
      },
      body: JSON.stringify({
        text_query: params.query,
        limit: normalizeLimit(params.limit),
        enable_page_crawling: Boolean(params.include_content),
        timeout_seconds: 30,
      }),
      signal: controller.signal,
    });

    // 检查响应状态
    if (response.status !== 200) {
      return error(
        `搜索失败。状态码：${response.status}。这可能表示搜索服务当前不可用。`,
        "搜索失败"
      );
    }

    // 解析并格式化结果
    try {
      const results = parseSearchResponse(await response.json());
      const chunks: string[] = [];
      for (let i = 0; i < results.length; i += 1) {
        const result = results[i];
        if (i > 0) {
          chunks.push("---\n\n");  // 分隔符
        }
        chunks.push(
          `Title: ${result.title}\nDate: ${result.date ?? ""}\nURL: ${result.url}\nSummary: ${result.snippet}\n\n`
        );
        if (result.content) {
          chunks.push(`${result.content}\n\n`);
        }
      }
      return ok(chunks.join(""));
    } catch (e) {
      return error(
        `解析搜索结果失败。错误：${String(e)}。这可能表示搜索服务返回了意外格式。`,
        "解析搜索结果失败"
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}

// ==================== 网页获取功能 ====================

/**
 * 通过 Kimi 服务获取网页
 * @param params 获取参数
 * @param ctx 获取上下文
 * @param fetchLike fetch 函数
 * @returns 网页内容
 */
async function fetchWithService(
  params: FetchParams,
  ctx: FetchContext,
  fetchLike: typeof fetch
): Promise<ToolResult> {
  const service = ctx.service;
  if (!service) {
    return error(
      "获取服务未配置。",
      "获取服务未配置"
    );
  }

  const baseUrl = service.baseUrl.trim();
  const apiKey = service.apiKey.trim();

  if (!baseUrl || !apiKey) {
    return error(
      "获取服务未配置。",
      "获取服务未配置"
    );
  }

  try {
    const response = await fetchLike(baseUrl, {
      method: "POST",
      headers: {
        "User-Agent": ctx.userAgent,
        Authorization: `Bearer ${apiKey}`,
        Accept: "text/markdown",
        "X-Msh-Tool-Call-Id": ctx.toolCallId,
        "Content-Type": "application/json",
        ...(service.customHeaders ?? {}),
      },
      body: JSON.stringify({ url: params.url }),
    });

    if (response.status !== 200) {
      return error(
        `通过服务获取网页失败。状态码：${response.status}。`,
        "通过服务获取网页失败"
      );
    }

    return ok(
      await response.text(),
      "返回的内容是从页面提取的主要文本内容。"
    );
  } catch (e) {
    return error(
      `通过服务获取网页时发生网络错误：${String(e)}。`,
      "调用获取服务时网络错误"
    );
  }
}

/**
 * 解码 HTML 实体
 * @param input HTML 字符串
 * @returns 解码后的字符串
 */
function decodeHtmlEntities(input: string): string {
  return input
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code))
    )
    .replaceAll(/&#x([\da-fA-F]+);/g, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    );
}

/**
 * 从 HTML 中提取有意义的文本
 * @param html HTML 内容
 * @returns 提取的纯文本
 */
function extractMeaningfulText(html: string): string {
  // 移除脚本、样式和 noscript 标签
  const stripped = html
    .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gis, " ")
    .replaceAll(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gis, " ")
    .replaceAll(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gis, " ")
    .replaceAll(/<!--([\s\S]*?)-->/g, " ")
    // 将块级标签转换为换行符
    .replaceAll(/<\/?(h[1-6]|p|div|article|section|li|tr|td|th|ul|ol|br)\b[^>]*>/gi, "\n")
    // 移除其他所有标签
    .replaceAll(/<[^>]+>/g, " ");

  // 解码实体并规范化空白
  const decoded = decodeHtmlEntities(stripped)
    .replaceAll(/\r\n?/g, "\n")
    .replaceAll(/\t/g, " ")
    .replaceAll(/[ \u00A0]+/g, " ")
    .replaceAll(/\n{3,}/g, "\n\n")  // 多个换行合并为两个
    .trim();

  return decoded;
}

/**
 * 通过直接 HTTP GET 获取网页
 * @param params 获取参数
 * @param fetchLike fetch 函数
 * @returns 网页内容
 */
async function fetchWithHttpGet(
  params: FetchParams,
  fetchLike: typeof fetch
): Promise<ToolResult> {
  let response: Response;
  let respText: string;

  try {
    response = await fetchLike(params.url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (response.status >= 400) {
      return error(
        `获取网页失败。状态码：${response.status}。这可能表示页面无法访问或服务器已关闭。`,
        `HTTP ${response.status} 错误`
      );
    }

    respText = await response.text();
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();

    // 纯文本直接返回
    if (contentType.startsWith("text/plain") || contentType.startsWith("text/markdown")) {
      return ok(respText, "返回的内容是页面的完整内容。");
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return error(
      `获取网页时发生网络错误：${message}。这可能表示 URL 无效或服务器无法访问。`,
      "网络错误"
    );
  }

  if (!respText) {
    return ok("", "响应体为空。", "空响应体");
  }

  // 从 HTML 提取文本
  const extractedText = extractMeaningfulText(respText);
  if (!extractedText) {
    return error(
      "无法从页面提取有意义的内容。这可能表示页面内容不适合文本提取，或页面需要 JavaScript 才能渲染。",
      "未提取到内容"
    );
  }

  return ok(
    extractedText,
    "返回的内容是从页面提取的主要文本内容。"
  );
}

/**
 * 执行网页获取
 * 优先使用 Kimi 服务，失败时回退到直接 HTTP GET
 */
export async function executeFetch(
  params: FetchParams,
  ctx: FetchContext,
  fetchLike: typeof fetch = fetch
): Promise<ToolResult> {
  // 先尝试使用 Kimi 服务
  if (ctx.service) {
    const serviceRet = await fetchWithService(params, ctx, fetchLike);
    if (!serviceRet.is_error) {
      return serviceRet;
    }
  }
  // 回退到直接 HTTP 获取
  return fetchWithHttpGet(params, fetchLike);
}

// ==================== 批量搜索功能 ====================

/**
 * 执行批量搜索
 * 串行执行多个搜索请求（避免并发连接问题）
 * @param params 批量搜索参数
 * @param baseCtx 搜索上下文
 * @param fetchLike fetch 函数
 * @returns 合并的搜索结果
 */
export async function executeBatchSearch(
  params: BatchSearchParams,
  baseCtx: SearchContext,
  fetchLike: typeof fetch = fetch
): Promise<ToolResult> {
  // 限制最多 5 个查询
  const queries = params.queries.slice(0, 5);

  if (queries.length === 0) {
    return error(
      "未提供查询。请至少提供一个查询。",
      "空查询"
    );
  }

  // 串行执行所有搜索（避免并发连接问题）
  const results: BatchSearchResult[] = [];
  for (let i = 0; i < queries.length; i++) {
    const item = queries[i];
    const ctx: SearchContext = {
      ...baseCtx,
      toolCallId: `${baseCtx.toolCallId}_batch_${i}`,
    };

    const searchParams: SearchParams = {
      query: item.query,
      limit: item.limit ?? 5,
      include_content: item.include_content ?? false,
    };

    const result = await executeSearch(searchParams, ctx, fetchLike);
    results.push({ query: item.query, result });
  }

  // 合并结果
  const outputParts: string[] = [];
  outputParts.push(`# 批量搜索结果 (${results.length} 个查询)\n`);

  for (let i = 0; i < results.length; i++) {
    const { query, result } = results[i];
    outputParts.push(`\n${"=".repeat(80)}`);
    outputParts.push(`\n## 查询 ${i + 1}: "${query}"`);
    outputParts.push(`\n${"=".repeat(80)}\n`);

    if (result.is_error) {
      outputParts.push(`\n❌ 错误：${result.message}\n`);
    } else {
      outputParts.push(result.output);
    }
  }

  const hasErrors = results.some((r) => r.result.is_error);
  const successCount = results.filter((r) => !r.result.is_error).length;

  return ok(
    outputParts.join(""),
    hasErrors
      ? `批量搜索完成，${successCount}/${results.length} 个查询成功。`
      : `全部 ${results.length} 个查询成功完成。`,
    hasErrors ? "部分成功" : "成功"
  );
}

// ==================== 批量获取功能 ====================

/**
 * 执行批量网页获取
 * 串行执行多个获取请求（避免并发连接问题）
 * @param params 批量获取参数
 * @param baseCtx 获取上下文
 * @param fetchLike fetch 函数
 * @returns 合并的获取结果
 */
export async function executeBatchFetch(
  params: BatchFetchParams,
  baseCtx: FetchContext,
  fetchLike: typeof fetch = fetch
): Promise<ToolResult> {
  // 限制最多 5 个 URL
  const urls = params.urls.slice(0, 5);

  if (urls.length === 0) {
    return error(
      "未提供 URL。请至少提供一个 URL。",
      "空 URL"
    );
  }

  // 串行执行所有获取（避免并发连接问题）
  const results: BatchFetchResult[] = [];
  for (let i = 0; i < urls.length; i++) {
    const item = urls[i];
    const ctx: FetchContext = {
      ...baseCtx,
      toolCallId: `${baseCtx.toolCallId}_fetch_${i}`,
    };

    const fetchParams: FetchParams = {
      url: item.url,
    };

    const result = await executeFetch(fetchParams, ctx, fetchLike);
    results.push({ url: item.url, result });
  }

  // 合并结果
  const outputParts: string[] = [];
  outputParts.push(`# 批量获取结果 (${results.length} 个 URL)\n`);

  for (let i = 0; i < results.length; i++) {
    const { url, result } = results[i];
    outputParts.push(`\n${"=".repeat(80)}`);
    outputParts.push(`\n## URL ${i + 1}: ${url}`);
    outputParts.push(`\n${"=".repeat(80)}\n`);

    if (result.is_error) {
      outputParts.push(`\n❌ 错误：${result.message}\n`);
    } else {
      outputParts.push(result.output);
    }
  }

  const hasErrors = results.some((r) => r.result.is_error);
  const successCount = results.filter((r) => !r.result.is_error).length;

  return ok(
    outputParts.join(""),
    hasErrors
      ? `批量获取完成，${successCount}/${results.length} 个 URL 成功。`
      : `全部 ${results.length} 个 URL 获取成功。`,
    hasErrors ? "部分成功" : "成功"
  );
}
