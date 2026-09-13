import { cloudWritebackStatus } from "../lib/cloud-demo";

export default function handler(req: any, res: any) {
  setCors(res);
  const assetId =
    typeof req.query.assetId === "string" ? req.query.assetId : null;
  res.status(200).json(cloudWritebackStatus(assetId));
}

function setCors(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}
