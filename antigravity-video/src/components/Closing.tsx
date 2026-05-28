import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { SPEED } from "../utils/speed";

interface CheckItemProps {
  text: string;
  delay: number;
  color: string;
  icon: string;
}

const CheckItem: React.FC<CheckItemProps> = ({ text, delay, color, icon }) => {
  const raw = useCurrentFrame();
  const frame = raw * SPEED;

  const x = interpolate(frame, [delay, delay + 35], [-120, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const opacity = interpolate(frame, [delay, delay + 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const checkScale = interpolate(frame, [delay + 20, delay + 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        transform: `translateX(${x}px)`,
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${checkScale})`,
          width: 52,
          height: 52,
          backgroundColor: color,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          flexShrink: 0,
          boxShadow: `0 0 20px ${color}50`,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 33,
          color: "rgba(255,255,255,0.9)",
          fontWeight: 600,
          lineHeight: 1.3,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const Closing: React.FC = () => {
  const raw = useCurrentFrame();
  const frame = raw * SPEED;

  const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [10, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(frame, [10, 40], [-20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        opacity: bgOpacity,
        background:
          "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(66,133,244,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(66,133,244,0.06) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "60px 80px",
          gap: 40,
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontSize: 50,
            fontWeight: 800,
            color: "white",
          }}
        >
          ✅ まず確認すること
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 36,
            flex: 1,
            justifyContent: "center",
          }}
        >
          <CheckItem
            text="Gemini CLI → 6/18までに移行"
            delay={35}
            color="#EA4335"
            icon="⚠️"
          />
          <CheckItem
            text="Antigravity 2.0 を試してみる"
            delay={85}
            color="#4285F4"
            icon="🚀"
          />
          <CheckItem
            text="Gemini 3.5 Flash の速さを体感"
            delay={135}
            color="#34A853"
            icon="⚡"
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
