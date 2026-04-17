import { useQRCode } from "next-qrcode";

type QrProps = {
  invoice: string;
};

const Qr = ({ invoice }: QrProps) => {
  const text = `lightning:${invoice}`;
  const { Canvas } = useQRCode();

  return (
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
            light: "#ffa500",
          },
        }}
      />
    </a>
  );
};

export default Qr;
