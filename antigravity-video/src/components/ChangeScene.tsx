import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { SPEED } from "../utils/speed";

interface ChangeSceneProps {
  number: number;
  title: string;
  before: string;
  beforeSub: string;
  after: string;
  afterSub: string;
  reason: string;
  bullets: string[];
  accentColor: string;
}

const Bullet: React.FC<{ text: string; delay: number; color: string }> = ({
  text,
  delay,
  color,
}) => {
  const raw = useCurrentFrame();
  const frame = raw * SPEED;

  const x = interpolate(frame, [delay, delay + 25], [-30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const opacity = interpolate(frame, [delay, delay + 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        transform: `translateX(${x}px)`,
        opacity,
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: color,
          marginTop: 10,
          flexShrink: 0,
        }}
      />
      <div style={{ fontSize: 18, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
        {text}
      </div>
    </div>
  );
};

export const ChangeScene: React.FC<ChangeSceneProps> = ({
  number,
  title,
  before,
  beforeSub,
  after,
  afterSub,
  reason,
  bullets,
  accentColor,
}) => {
  const raw = useCurrentFrame();
  const frame = raw * SPEED;
  const { fps } = useVideoConfig();

  const sceneOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const headerY = interpolate(frame, [5, 35], [-30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const headerOpacity = interpolate(frame, [5, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const beforeX = interpolate(frame, [15, 55], [-180, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const beforeOpacity = interpolate(frame, [15, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const afterX = interpolate(frame, [15, 55], [180, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const afterOpacity = interpolate(frame, [15, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const arrowOpacity = interpolate(frame, [45, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const arrowScale = interpolate(frame, [45, 75], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });

  // Reason box at 5s mark (uses original fps timing)
  const reasonStart = 5 * fps;
  const reasonY = interpolate(frame, [reasonStart, reasonStart + 40], [50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const reasonOpacity = interpolate(
    frame,
    [reasonStart, reasonStart + 40],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const reasonLabelOpacity = interpolate(
    frame,
    [reasonStart + 10, reasonStart + 35],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
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
          padding: "44px 68px",
          gap: 22,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            transform: `translateY(${headerY}px)`,
            opacity: headerOpacity,
          }}
        >
          <div
            style={{
              backgroundColor: accentColor,
              color: "white",
              width: 56,
              height: 56,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            {number}
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, color: "white" }}>
            変更{number}：{title}
          </div>
        </div>

        {/* Before / After cards */}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 24,
            flex: 1,
          }}
        >
          {/* Before card */}
          <div
            style={{
              flex: 1,
              transform: `translateX(${beforeX}px)`,
              opacity: beforeOpacity,
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "2px solid rgba(252,129,129,0.35)",
              borderRadius: 20,
              padding: "28px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#fc8181",
                letterSpacing: 4,
              }}
            >
              変 更 前
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "rgba(255,255,255,0.38)",
                textDecoration: "line-through",
                textDecorationColor: "#fc8181",
                textDecorationThickness: 3,
                lineHeight: 1.3,
              }}
            >
              {before}
            </div>
            <div style={{ fontSize: 18, color: "rgba(255,255,255,0.25)" }}>
              {beforeSub}
            </div>
          </div>

          {/* Arrow */}
          <div
            style={{
              opacity: arrowOpacity,
              transform: `scale(${arrowScale})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              color: accentColor,
              fontWeight: 900,
              flexShrink: 0,
              width: 68,
            }}
          >
            →
          </div>

          {/* After card */}
          <div
            style={{
              flex: 1,
              transform: `translateX(${afterX}px)`,
              opacity: afterOpacity,
              backgroundColor: "rgba(255,255,255,0.055)",
              border: `2px solid ${accentColor}55`,
              borderRadius: 20,
              padding: "28px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxShadow: `0 0 50px ${accentColor}18`,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: accentColor,
                letterSpacing: 4,
              }}
            >
              変 更 後
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "white",
                lineHeight: 1.3,
              }}
            >
              {after}
            </div>
            <div style={{ fontSize: 18, color: "rgba(255,255,255,0.52)" }}>
              {afterSub}
            </div>
          </div>
        </div>

        {/* Reason + bullets */}
        <div
          style={{
            transform: `translateY(${reasonY}px)`,
            opacity: reasonOpacity,
            backgroundColor: `${accentColor}16`,
            border: `1.5px solid ${accentColor}42`,
            borderRadius: 18,
            padding: "20px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              opacity: reasonLabelOpacity,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 19, flexShrink: 0, marginTop: 1 }}>💡</span>
            <div
              style={{
                fontSize: 20,
                color: accentColor,
                fontWeight: 700,
                lineHeight: 1.5,
              }}
            >
              {reason}
            </div>
          </div>

          <div
            style={{
              opacity: reasonLabelOpacity,
              height: 1,
              backgroundColor: `${accentColor}30`,
              margin: "2px 0",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {bullets.map((bullet, i) => (
              <Bullet
                key={i}
                text={bullet}
                delay={reasonStart + 40 + i * 20}
                color={accentColor}
              />
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
