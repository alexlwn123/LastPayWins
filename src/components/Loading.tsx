import type { ReactNode } from "react";
import { Triangle } from "react-loader-spinner";

type LoadingProps = {
  isLoading: boolean;
  children: ReactNode;
};

const Loading = ({ isLoading, children }: LoadingProps) =>
  isLoading ? (
    <Triangle
      height="80"
      width="80"
      color="#4fa94d"
      ariaLabel="triangle-loading"
      wrapperStyle={{}}
      visible={true}
    />
  ) : (
    children
  );
export default Loading;
