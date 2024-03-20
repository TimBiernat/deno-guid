import { monotonicFactory } from "https://deno.land/x/ulid@v0.3.0/mod.ts";

const COLLECTION = "users";
const ulid = monotonicFactory();
const kv = await Deno.openKv();

Deno.serve(async (request) => {
  const url = new URL(request.url);
  let path = url.pathname.trim().slice(1);
  let guid;
  if (path.length > 0 && path !== "favicon.ico") {
    if (path.endsWith("+")) { 
      path = path.slice(0, -1);
      const result = await kv.get<string>([COLLECTION, path]);
      if (result.value) {  // update user
        guid = ulid();
        kv.set([COLLECTION, path], guid);
        console.log(path + ":" + guid + " (UPDATE)");
        return new Response(guid, { status: 200 });
      } else {
        return new Response("Error: user not found", { status: 404 });
      }
    }
    const result = await kv.get<string>([COLLECTION, path]);
    if (result.value) { // existing user
      guid = result.value;
      console.log(path + ":" + guid);
    } else { // new user
      guid = ulid();
      kv.set([COLLECTION, path], guid);
      console.log(path + ":" + guid + " (CREATE)");
    }
    return new Response(guid, { status: 200 });
  }
  return new Response("Error: no username provided in path", { status: 400 });
});
