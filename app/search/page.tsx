import SearchInterface from '../../components/SearchInterface'

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Expense Search</h1>
        <SearchInterface />
      </div>
    </div>
  )
}
