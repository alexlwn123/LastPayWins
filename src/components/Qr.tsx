import { useQRCode } from "next-qrcode";

export default (invoice) => {
  const text = `lightning:${invoice.invoice}`
  const { Canvas } = useQRCode();
  return invoice ? (
    <Canvas
      text={text}
      options={{
        level: "L",
        margin: 3,
        scale: 4,
        width: 300,
        color: {
          dark: "#010599FF",
          light: "#FFBF60FF",
        },
      }}
    />
  ) : <h1>LOADING</h1>;

}