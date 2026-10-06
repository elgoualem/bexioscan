// Worker Cloudflare — relais vers l'API bexio (contourne le CORS navigateur)
export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, x-bexio-token",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // Relais vers les API LLM (Qwen, Kimi, GLM…) pour contourner le CORS navigateur
    if (url.pathname.startsWith("/llm-proxy")) {
      const HOTES_AUTORISES = ["dashscope-intl.aliyuncs.com", "dashscope.aliyuncs.com", "api.moonshot.ai", "api.moonshot.cn", "open.bigmodel.cn"];
      let cible;
      try { cible = new URL(url.searchParams.get("url") || ""); } catch { cible = null; }
      if (!cible || cible.protocol !== "https:" || !HOTES_AUTORISES.includes(cible.hostname)) {
        return new Response(JSON.stringify({ error: "Hôte LLM non autorisé" }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      try {
        const resp = await fetch(cible.toString(), {
          method: request.method,
          headers: {
            Authorization: request.headers.get("authorization") || "",
            "Content-Type": request.headers.get("content-type") || "application/json",
          },
          body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
        });
        return new Response(await resp.text(), {
          status: resp.status,
          headers: { ...cors, "Content-Type": resp.headers.get("content-type") || "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Relais LLM indisponible : " + e.message }), {
          status: 502, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    if (!url.pathname.startsWith("/bexio-proxy")) {
      return env.ASSETS.fetch(request);
    }

    const targetPath = url.searchParams.get("path");
    if (!targetPath) {
      return new Response(JSON.stringify({ error: "Paramètre 'path' manquant" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const bexioToken = request.headers.get("x-bexio-token") || "";
    if (!bexioToken) {
      return new Response(JSON.stringify({ error: "Token bexio manquant" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    try {
      const cleanPath = targetPath.replace(/^\/+/, "");
      const contentType = request.headers.get("content-type") || "application/json";
      const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();

      const resp = await fetch(`https://api.bexio.com/${cleanPath}`, {
        method: request.method,
        headers: {
          Authorization: `Bearer ${bexioToken}`,
          "Content-Type": contentType,
          Accept: "application/json",
        },
        body,
      });

      const text = await resp.text();
      return new Response(text, {
        status: resp.status,
        headers: {
          ...cors,
          "Content-Type": resp.headers.get("content-type") || "application/json",
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Relais indisponible : " + e.message }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  },
};
