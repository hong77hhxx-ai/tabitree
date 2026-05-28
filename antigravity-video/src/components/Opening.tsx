import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { SPEED } from "../utils/speed";

export const Opening: React.FC = () => {
  const raw = useCurrentFrame();
  const frame = raw * SPEED;

  const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const badgeOpacity = interpolate(frame, [5, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const badgeY = interpolate(frame, [5, 30], [-20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const titleScale = interpolate(frame, [20, 70], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const titleOpacity = interpolate(frame, [20, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitleY = interpolate(frame, [50, 90], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const subtitleOpacity = interpolate(frame, [50, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: bgOpacity }}>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
        }}
      />
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
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        <div
          style={{
            opacity: badgeOpacity,
            transform: `translateY(${badgeY}px)`,
            backgroundColor: "#EA4335",
            color: "white",
            padding: "12px 32px",
            borderRadius: 100,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 5,
          }}
        >
          ⚡ NEW UPDATE
        </div>

        <div
          style={{
            transform: `scale(${titleScale})`,
            opacity: titleOpacity,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 108,
              fontWeight: 900,
              color: "white",
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            Antigravity 2.0
          </div>
        </div>

        <div
          style={{
            transform: `translateY(${subtitleY}px)`,
            opacity: subtitleOpacity,
            fontSize: 36,
            color: "#90cdf4",
            textAlign: "center",
            letterSpacing: 1,
          }}
        >
          Google 開発ツールが大幅アップデート
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
