#!/usr/bin/env node

/**
 * Kimi Search MCP Plugin - 综合测试脚本
 *
 * 测试所有四个工具:
 * 1. kimi_search - 单关键词搜索
 * 2. kimi_fetch - 单网页获取
 * 3. kimi_batch_search - 批量搜索
 * 4. kimi_batch_fetch - 批量获取
 */

import {
  executeSearch,
  executeFetch,
  executeBatchSearch,
  executeBatchFetch,
} from "../logic.js";

const apiKeyRaw = process.env.KIMI_CODE_API_KEY?.trim();

if (!apiKeyRaw) {
  console.error("❌ 错误: 请设置 KIMI_CODE_API_KEY 环境变量");
  console.error("用法: KIMI_CODE_API_KEY=your-key npm test");
  process.exit(1);
}

const apiKey = apiKeyRaw;

const DEFAULT_SEARCH_URL = "https://api.kimi.com/coding/v1/search";
const DEFAULT_FETCH_URL = "https://api.kimi.com/coding/v1/fetch";

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

async function testSearch(): Promise<boolean> {
  console.log("\n🔍 测试 kimi_search...");
  console.log("-".repeat(50));

  const result = await executeSearch(
    { query: "Claude Code MCP 插件开发", limit: 3 },
    {
      toolCallId: `test_${Date.now()}`,
      userAgent: "KimiSearchMCP-Test/1.0",
      config: {
        baseUrl: (process.env.KIMI_SEARCH_URL?.trim() || DEFAULT_SEARCH_URL),
        apiKey,
        timeoutSeconds: 30,
        customHeaders: defaultMshHeaders(),
      },
    }
  );

  if (result.is_error) {
    console.error("❌ 搜索失败:", result.message);
    return false;
  }

  console.log("✅ 搜索成功!");
  console.log("结果预览:", result.output.substring(0, 200) + "...");
  return true;
}

async function testFetch(): Promise<boolean> {
  console.log("\n📄 测试 kimi_fetch...");
  console.log("-".repeat(50));

  const result = await executeFetch(
    { url: "https://docs.anthropic.com/en/docs/agents-and-tools/mcp" },
    {
      toolCallId: `test_${Date.now()}`,
      userAgent: "KimiSearchMCP-Test/1.0",
      service: {
        baseUrl: (process.env.KIMI_FETCH_URL?.trim() || DEFAULT_FETCH_URL),
        apiKey,
        customHeaders: defaultMshHeaders(),
      },
    }
  );

  if (result.is_error) {
    console.error("❌ 获取失败:", result.message);
    return false;
  }

  console.log("✅ 获取成功!");
  console.log("内容预览:", result.output.substring(0, 200) + "...");
  return true;
}

async function testBatchSearch(): Promise<boolean> {
  console.log("\n🔍 测试 kimi_batch_search...");
  console.log("-".repeat(50));

  const result = await executeBatchSearch(
    {
      queries: [
        { query: "Docker 部署", limit: 2 },
        { query: "Node.js 22", limit: 2 },
        { query: "AI Agent", limit: 2 },
      ],
    },
    {
      toolCallId: `batch_test_${Date.now()}`,
      userAgent: "KimiSearchMCP-Test/1.0",
      config: {
        baseUrl: (process.env.KIMI_SEARCH_URL?.trim() || DEFAULT_SEARCH_URL),
        apiKey,
        timeoutSeconds: 30,
        customHeaders: defaultMshHeaders(),
      },
    }
  );

  if (result.is_error) {
    console.error("❌ 批量搜索失败:", result.message);
    return false;
  }

  console.log("✅ 批量搜索成功!");
  console.log("摘要:", result.message);
  return true;
}

async function testBatchFetch(): Promise<boolean> {
  console.log("\n📄 测试 kimi_batch_fetch...");
  console.log("-".repeat(50));

  const result = await executeBatchFetch(
    {
      urls: [
        { url: "https://docs.anthropic.com/en/docs/agents-and-tools/mcp" },
        { url: "https://github.com/modelcontextprotocol" },
      ],
    },
    {
      toolCallId: `batch_fetch_test_${Date.now()}`,
      userAgent: "KimiSearchMCP-Test/1.0",
      service: {
        baseUrl: (process.env.KIMI_FETCH_URL?.trim() || DEFAULT_FETCH_URL),
        apiKey,
        customHeaders: defaultMshHeaders(),
      },
    }
  );

  if (result.is_error) {
    console.error("❌ 批量获取失败:", result.message);
    return false;
  }

  console.log("✅ 批量获取成功!");
  console.log("摘要:", result.message);
  return true;
}

async function main() {
  console.log("🚀 Kimi Search MCP Plugin - 综合测试");
  console.log("=".repeat(50));
  console.log("API Key:", apiKey.substring(0, 8) + "...");

  const results: Record<string, boolean> = {
    kimi_search: false,
    kimi_fetch: false,
    kimi_batch_search: false,
    kimi_batch_fetch: false,
  };

  try {
    results.kimi_search = await testSearch();
  } catch (e) {
    console.error("搜索测试异常:", e);
  }

  try {
    results.kimi_fetch = await testFetch();
  } catch (e) {
    console.error("获取测试异常:", e);
  }

  try {
    results.kimi_batch_search = await testBatchSearch();
  } catch (e) {
    console.error("批量搜索测试异常:", e);
  }

  try {
    results.kimi_batch_fetch = await testBatchFetch();
  } catch (e) {
    console.error("批量获取测试异常:", e);
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 测试结果汇总:");
  console.log("=".repeat(50));

  for (const [name, passed] of Object.entries(results)) {
    console.log(`  ${name}: ${passed ? "✅ 通过" : "❌ 失败"}`);
  }

  const allPassed = Object.values(results).every((r) => r);

  if (allPassed) {
    console.log("\n🎉 所有测试通过! 插件可以正常使用。");
    process.exit(0);
  } else {
    console.log("\n⚠️ 部分测试失败，请检查配置和 API Key。");
    process.exit(1);
  }
}

main();
