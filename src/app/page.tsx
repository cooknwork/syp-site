import { content } from '@/data/seed';
import { SypWorld } from '@/features/world/SypWorld';

export default function Home() {
  return <SypWorld content={content} />;
}
