import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { sf } from "./utils/speed";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AntigravityUpdate"
        component={MyComposition}
        durationInFrames={sf(90 * 30)}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
