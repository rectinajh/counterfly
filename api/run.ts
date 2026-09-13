import { proxyApi } from "../lib/cloud-proxy";

export default function handler(req: any, res: any) {
  return proxyApi(req, res);
}
