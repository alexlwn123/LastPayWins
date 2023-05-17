import { useEffect } from "react";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

export default (currentTime) => {
  const duration = 60;
  useEffect(() => {

  }, [currentTime]);
  return (
    <CountdownCircleTimer
      isPlaying
      duration={duration}
      initialRemainingTime={currentTime}
      colors={["#004777", "#F7B801", "#A30000", "#A30000"]}
      colorsTime={[7, 5, 2, 0]}
    >
      {({ remainingTime }) => remainingTime}
    </CountdownCircleTimer>
  );
};
