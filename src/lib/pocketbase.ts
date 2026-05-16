import PocketBase from "pocketbase";

let _pb: PocketBase | null = null;

export function getPb(): PocketBase {
  if (!_pb) {
    _pb = new PocketBase(
      import.meta.env.VITE_POCKETBASE_URL ?? "http://127.0.0.1:8090"
    );
  }
  return _pb;
}
