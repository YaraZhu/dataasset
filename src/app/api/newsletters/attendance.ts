import { getNewsletterByIssue } from '@/lib/db';

// 获取某期周讯已收录的资讯情况（供前端展示）
export async function getIssueNewsletterAttendance(issueNumber: number): Promise<{
  newsletter: Awaited<ReturnType<typeof getNewsletterByIssue>>;
}> {
  const newsletter = await getNewsletterByIssue(issueNumber);
  return { newsletter };
}