import { Triangle } from "react-loader-spinner";

const Loading = ({ isLoading, children }) =>
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
