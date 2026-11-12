import { redirect } from 'next/navigation';

// DisputeOS starts on the dispute queue.
export default function Home() {
  redirect('/dashboard');
}
