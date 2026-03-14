#!/usr/bin/env node

/**
 * Kimi Search MCP Plugin
 *
 * Claude Code MCP 服务器，提供搜索和网页获取功能
 * 包含四个工具：
 * 1. kimi_search - 单关键词搜索
 * 2. kimi_fetch - 获取单个网页
 * 3. kimi_batch_search - 批量多关键词搜索
 * 4. kimi_batch_fetch - 批量获取多个网页
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  executeSearch,
  executeFetch,
  executeBatchSearch,
  executeBatchFetch,
} from "./logic.js";

// ==================== 配置常量 ====================

/** 默认搜索 API 地址 */
const DEFAULT_SEARCH_URL = "https://api.kimi.com/coding/v1/search";
/** 默认网页获取 API 地址 */
const DEFAULT_FETCH_URL = "https://api.kimi.com/coding/v1/fetch";

/**
 * 从环境变量获取 API Key
 * 可以通过以下方式设置：
 * 1. 系统环境变量：export KIMI_CODE_API_KEY=xxx
 * 2. MCP 安装时传递：claude mcp add ... -e KIMI_CODE_API_KEY=xxx
 */
const apiKey = process.env.KIMI_CODE_API_KEY?.trim() || "";

/**
 * 生成默认平台请求头
 * 用于标识请求来源平台信息
 */
function defaultMshHeaders(): Record<string, string> {
  return {
    "X-Msh-Platform": process.env.KIMI_MSH_PLATFORM?.trim() || "kimi_cli",
    "X-Msh-Version": process.env.KIMI_MSH_VERSION?.trim() || "test",
    "X-Msh-Device-Name": process.env.KIMI_MSH_DEVICE_NAME?.trim() || "kimi-search-mcp",
    "X-Msh-Device-Model": process.env.KIMI_MSH_DEVICE_MODEL?.trim() || "kimi-search-mcp",
    "X-Msh-Os-Version": process.env.KIMI_MSH_OS_VERSION?.trim() || process.platform,
    "X-Msh-Device-Id": process.env.KIMI_MSH_DEVICE_ID?.trim() || "kimi-search-mcp",
  };
}

/** User-Agent 字符串 */
const userAgent = process.env.KIMI_AGENT_USER_AGENT?.trim() || "KimiSearchMCP/1.0";

// ==================== 工具定义 ====================

/**
 * 单关键词搜索工具
 * 用于搜索互联网获取最新信息
 */
const SEARCH_TOOL: Tool = {
  name: "kimi_search",
  description:
    "搜索互联网获取最新信息（新闻、文档、发布信息、博客、论文等）。" +
    "返回搜索结果，包含标题、URL、摘要，可选择包含完整内容。" +
    "适合快速查找特定主题的信息。",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      query: {
        type: "string",
        description: "搜索关键词，描述你想要查找的内容",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 20,
        default: 10,
        description: "返回结果数量（1-20），默认10条",
      },
      include_content: {
        type: "boolean",
        default: false,
        description: "是否包含页面完整内容（会消耗更多token），默认false",
      },
    },
    required: ["query"],
  },
};

/**
 * 单网页获取工具
 * 用于获取指定 URL 的网页内容
 */
const FETCH_TOOL: Tool = {
  name: "kimi_fetch",
  description:
    "获取指定 URL 的网页内容并提取主要文本。" +
    "优先使用 Kimi 获取服务，失败时回退到直接 HTTP GET 并解析 HTML。" +
    "适合在搜索后获取某条结果的详细内容。",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      url: {
        type: "string",
        description: "要获取的网页完整 URL（包含 https://）",
      },
    },
    required: ["url"],
  },
};

/**
 * 批量搜索工具
 * 同时搜索多个不同关键词，最多5个
 */
const BATCH_SEARCH_TOOL: Tool = {
  name: "kimi_batch_search",
  description:
    "批量搜索 - 同时搜索多个不同关键词（最多5个），返回合并结果。" +
    "适合需要对比不同术语、获取多角度信息或快速了解多个相关主题时使用。" +
    "每个查询可以独立设置返回数量和是否包含内容。",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      queries: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        description: "搜索查询数组（最多5个）",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            query: {
              type: "string",
              description: "搜索关键词",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 10,
              default: 5,
              description: "该查询返回的结果数量（1-10），默认5条",
            },
            include_content: {
              type: "boolean",
              default: false,
              description: "是否包含该查询的完整页面内容，默认false",
            },
          },
          required: ["query"],
        },
      },
    },
    required: ["queries"],
  },
};

/**
 * 批量网页获取工具
 * 同时获取多个 URL 的内容，最多5个
 */
const BATCH_FETCH_TOOL: Tool = {
  name: "kimi_batch_fetch",
  description:
    "批量获取 - 同时获取多个网页内容（最多5个），返回合并结果。" +
    "适合在搜索后需要对比分析多个网页内容时使用。" +
    "优先使用 Kimi 服务，失败时回退到直接 HTTP GET。",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      urls: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        description: "URL数组（最多5个）",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            url: {
              type: "string",
              description: "要获取的网页完整 URL",
            },
          },
          required: ["url"],
        },
      },
    },
    required: ["urls"],
  },
};

// ==================== MCP 服务器 ====================

/** 创建 MCP 服务器实例 */
const server = new Server(
  {
    name: "kimi-search-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * 工具调用处理器
 * 处理所有工具调用请求
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const toolCallId = (request.params._meta?.toolCallId as string) || `call_${Date.now()}`;

  // 检查 API Key 是否配置
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "错误：未设置 KIMI_CODE_API_KEY 环境变量。请通过以下方式配置：\n" +
                "1. 安装时传递：claude mcp add ... -e KIMI_CODE_API_KEY=your-key\n" +
                "2. 系统环境变量：export KIMI_CODE_API_KEY=your-key",
        },
      ],
      isError: true,
    };
  }

  try {
    // -------------------- kimi_search --------------------
    if (name === "kimi_search") {
      const params = {
        query: String(args.query || ""),
        limit: typeof args.limit === "number" ? args.limit : 10,
        include_content: Boolean(args.include_content),
      };

      const ctx = {
        toolCallId,
        userAgent,
        config: {
          baseUrl: process.env.KIMI_SEARCH_URL?.trim() || DEFAULT_SEARCH_URL,
          apiKey,
          timeoutSeconds: 30,
          customHeaders: defaultMshHeaders(),
        },
      };

      const result = await executeSearch(params, ctx);

      return {
        content: [
          {
            type: "text",
            text: result.output || result.message || (result.is_error ? "搜索失败。" : ""),
          },
        ],
        isError: result.is_error,
      };
    }

    // -------------------- kimi_fetch --------------------
    else if (name === "kimi_fetch") {
      const params = {
        url: String(args.url || ""),
      };

      const ctx = {
        toolCallId,
        userAgent,
        service: {
          baseUrl: process.env.KIMI_FETCH_URL?.trim() || DEFAULT_FETCH_URL,
          apiKey,
          customHeaders: defaultMshHeaders(),
        },
      };

      const result = await executeFetch(params, ctx);

      return {
        content: [
          {
            type: "text",
            text: result.output || result.message || (result.is_error ? "获取失败。" : ""),
          },
        ],
        isError: result.is_error,
      };
    }

    // -------------------- kimi_batch_search --------------------
    else if (name === "kimi_batch_search") {
      const queries = Array.isArray(args.queries) ? args.queries : [];

      const ctx = {
        toolCallId,
        userAgent,
        config: {
          baseUrl: process.env.KIMI_SEARCH_URL?.trim() || DEFAULT_SEARCH_URL,
          apiKey,
          timeoutSeconds: 30,
          customHeaders: defaultMshHeaders(),
        },
      };

      const result = await executeBatchSearch({ queries }, ctx);

      return {
        content: [
          {
            type: "text",
            text: result.output || result.message || (result.is_error ? "批量搜索失败。" : ""),
          },
        ],
        isError: result.is_error,
      };
    }

    // -------------------- kimi_batch_fetch --------------------
    else if (name === "kimi_batch_fetch") {
      const urls = Array.isArray(args.urls) ? args.urls : [];

      const ctx = {
        toolCallId,
        userAgent,
        service: {
          baseUrl: process.env.KIMI_FETCH_URL?.trim() || DEFAULT_FETCH_URL,
          apiKey,
          customHeaders: defaultMshHeaders(),
        },
      };

      const result = await executeBatchFetch({ urls }, ctx);

      return {
        content: [
          {
            type: "text",
            text: result.output || result.message || (result.is_error ? "批量获取失败。" : ""),
          },
        ],
        isError: result.is_error,
      };
    }

    // -------------------- 未知工具 --------------------
    else {
      return {
        content: [
          {
            type: "text",
            text: `未知工具：${name}。可用工具：kimi_search, kimi_fetch, kimi_batch_search, kimi_batch_fetch`,
          },
        ],
        isError: true,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `执行工具 ${name} 时发生错误：${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * 工具列表处理器
 * 返回所有可用工具的定义
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [SEARCH_TOOL, FETCH_TOOL, BATCH_SEARCH_TOOL, BATCH_FETCH_TOOL],
  };
});

// ==================== 启动服务器 ====================

/**
 * 主函数 - 启动 MCP 服务器
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Kimi Search MCP 服务器已启动（stdio 模式）");
}

main().catch((error) => {
  console.error("致命错误：", error);
  process.exit(1);
});
