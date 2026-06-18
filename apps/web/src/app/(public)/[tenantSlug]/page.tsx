export default function TenantPage({ params }: { params: { tenantSlug: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Turf: {params.tenantSlug}</h1>
      <p className="text-gray-600">Courts and booking slots will appear here</p>
    </div>
  );
}
