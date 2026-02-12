import { useQRCode } from "next-qrcode";

type QrProps = {
  invoice: string | null;
};

const Qr = ({ invoice }: QrProps) => {
  const text = `lightning:${invoice}`;
  const { Canvas } = useQRCode();

  return invoice ? (
    <a href={text}>
      <Canvas
        text={text}
        options={{
          errorCorrectionLevel: "L",
          margin: 3,
          scale: 4,
          width: 300,
          color: {
            dark: "#010599FF",
            light: "#FFBF60FF",
          },
        }}
      />
    </a>
  ) : (
    <h1>LOADING</h1>
  );
};

export default Qr;
