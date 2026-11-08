"use client";
import { AppProgressBar } from "next-nprogress-bar";
const ProgressBar = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <AppProgressBar
        height="2px"
        // ブランドの深緑 (globals.css の --primary と同じ色)
        color="#2d5a27"
        options={{ showSpinner: false }}
        shallowRouting
      />
    </>
  );
};
export default ProgressBar;
