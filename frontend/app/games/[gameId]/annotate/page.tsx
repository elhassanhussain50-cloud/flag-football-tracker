import { AnnotationViewer } from "@/components/annotation/AnnotationViewer";

interface Props {
  params: { gameId: string };
}

export default function AnnotatePage({ params }: Props) {
  return <AnnotationViewer gameId={Number(params.gameId)} />;
}
