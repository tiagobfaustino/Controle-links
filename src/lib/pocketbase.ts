import PocketBase from "pocketbase";

let _pb: PocketBase | null = null;

export function getPb(): PocketBase {
  if (!_pb) {
    _pb = new PocketBase(
      import.meta.env.VITE_POCKETBASE_URL ?? window.location.origin,
    );
  }
  return _pb;
}
