import EmployeeDetailView from '@/components/employees/EmployeeDetailView'

export default async function CalisanDetayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EmployeeDetailView employeeId={id} />
}
