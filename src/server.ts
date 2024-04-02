import { monotonicFactory } from "https://deno.land/x/ulid@v0.3.0/mod.ts";
import * as log from "https://deno.land/std@0.221.0/log/mod.ts";

function serverError(error: unknown) {
  return new Response("bad request:" + error, { status: 400 });
}

log.setup({
  handlers: {
    default: new log.ConsoleHandler("INFO", {
      useColors: true,
    }),
  },
});

const COLLECTION = "users";
const ulid = monotonicFactory();
const kv = await Deno.openKv();

const options: Deno.ServeOptions = {
  onError: serverError,
};

Deno.serve(options, async (request) => {
  const url = new URL(request.url);
  const path = url.pathname.trim().slice(1);

  switch (request.method) {
    case "GET": {
      const result = await kv.get<string>([COLLECTION, path]);
      if (!result.value) {
        log.warn("user not found: " + path);
        return new Response("user not found " + path, { status: 404 });
      } else {
        log.info("user found: " + JSON.stringify(result));
        return new Response(JSON.stringify(result), { status: 200 });
      }
    }
    case "POST": {
      const result = await kv.get<string>([COLLECTION, path]);
      if (result.value) {
        log.warn("user exists: " + path);
        return new Response("user exists", { status: 409 });
      } else {
        await kv.set([COLLECTION, path], ulid());
        const result = await kv.get<string>([COLLECTION, path]);
        log.info("user created: " + JSON.stringify(result));
        return new Response(JSON.stringify(result), { status: 200 });
      }
    }
    case "PUT": {
      const result = await kv.get<string>([COLLECTION, path]);
      if (!result.value) {
        log.warn("user not found: " + path);
        return new Response("user not found: " + path, { status: 404 });
      } else {
        await kv.set([COLLECTION, path], ulid());
        const result = await kv.get<string>([COLLECTION, path]);
        log.info("user updated: " + JSON.stringify(result));
        return new Response(JSON.stringify(result), { status: 200 });
      }
    }
    case "DELETE": {
      const result = await kv.get<string>([COLLECTION, path]);
      if (!result.value) {
        log.warn("user not found: " + path);
        return new Response("user not found: " + path, { status: 404 });
      } else {
        await kv.delete([COLLECTION, path]);
        log.info("user deleted: " + path);
        return new Response(null, { status: 204 });
      }
    }
  }
  log.info("bad request");
  return new Response("bad request", { status: 400 });
});
