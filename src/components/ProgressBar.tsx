"use client";
import { AppProgressBar } from "next-nprogress-bar";
const ProgressBar = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <AppProgressBar
        height="2px"
        // color="#fffd00"
        options={{ showSpinner: false }}
        shallowRouting
      />
    </>
  );
};
export default ProgressBar;
