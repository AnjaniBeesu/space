"use client";

export default function Preloader() {
  return (
    <div className="preloader">
      <div className="crack crack1"></div>
      <div className="crack crack2"></div>
      <div className="crack crack3"></div>
      <div className="crack crack4"></div>
      <div className="crack crack5"></div>
      <span
        className="preloader-loading"
        style={{
          position: "absolute",
          top: "calc(50% + 48px)",
          left: "50%",
          transform: "translateX(-50%)",
          color: "#fef3fc",
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          letterSpacing: ".16em",
          textTransform: "lowercase",
        }}
      >
        loading
      </span>
    </div>
  );
}
