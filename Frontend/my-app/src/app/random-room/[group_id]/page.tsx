"use client";

import { useParams } from 'next/navigation';
import RandomRoom from '../../components/random-room/RandomRoom';

export default function RandomRoomPage() {
  const params = useParams();
  const groupId = params.group_id as string;
  return <RandomRoom groupId={groupId} isModal={false} />;
} 