import ProjectStageSelectBase from "@/components/ProjectStageSelect";

type Props = {
  projectId: number;
  currentStage: string | null;
};

export default function ProjectStageSelect(props: Props) {
  return <ProjectStageSelectBase {...props} />;
}
