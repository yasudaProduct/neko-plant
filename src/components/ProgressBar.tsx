"use client";
import { AppProgressBar } from "next-nprogress-bar";
const ProgressBar = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <AppProgressBar
        height="2px"
        // ヘッダーと同じ深緑
        color="#2d5a27"
        options={{ showSpinner: false }}
        shallowRouting
      />
    </>
  );
};
export default ProgressBar;
