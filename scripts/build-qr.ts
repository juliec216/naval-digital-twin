import QRCode from "qrcode";
import path from "path";

const TARGET = "sms:+16284885732?&body=Hi";
const OUT = path.join(__dirname, "../docs/qr.svg");

async function main() {
  await QRCode.toFile(OUT, TARGET, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: {
      dark: "#000000",
      light: "#00000000",
    },
  });
  console.log(`Wrote ${OUT}`);
}

main();
