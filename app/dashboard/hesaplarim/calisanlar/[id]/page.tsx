import EmployeeForm from '@/components/employees/EmployeeForm'

export default async function DuzenleCalisanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="pb-8 pt-2">
      <EmployeeForm employeeId={id} />
    </div>
  )
}
