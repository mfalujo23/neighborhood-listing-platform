import type { Metadata } from 'next';
import VoiceSimulator from './simulator-client';

export const metadata: Metadata = {
  title: 'Voice workflow simulator | BarrioList',
  description: 'A fictional, deterministic text simulator for voice-tool boundaries and failure recovery.',
};

export default function VoiceSimulatorPage() {
  return <VoiceSimulator />;
}
