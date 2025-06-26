import { useEffect, useState } from "react";

function getBrowserVisibilityProp() {
  if (typeof document.hidden !== "undefined") {
    // Opera 12.10 and Firefox 18 and later support
    return "visibilitychange";
  } else if (typeof document["msHidden"] !== "undefined") {
    return "msvisibilitychange";
  } else if (typeof document["webkitHidden"] !== "undefined") {
    return "webkitvisibilitychange";
  }
}

function getBrowserDocumentHiddenProp() {
  if (typeof document.hidden !== "undefined") {
    return "hidden";
  } else if (typeof document["msHidden"] !== "undefined") {
    return "msHidden";
  } else if (typeof document["webkitHidden"] !== "undefined") {
    return "webkitHidden";
  }
}

function getIsDocumentHidden() {
  const hidden = getBrowserDocumentHiddenProp();
  return !document[hidden as keyof Document];
}

export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(getIsDocumentHidden());
  const onVisibilityChange = () => setIsVisible(getIsDocumentHidden());

  useEffect(() => {
    const visibilityChange = getBrowserVisibilityProp();

    document.addEventListener(
      visibilityChange as keyof DocumentEventMap,
      onVisibilityChange,
      false,
    );

    return () => {
      document.removeEventListener(
        visibilityChange as keyof DocumentEventMap,
        onVisibilityChange,
      );
    };
  });

  return isVisible;
}
