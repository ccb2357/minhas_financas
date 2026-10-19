<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Category\ListCategoryRequest;
use App\Http\Requests\Category\StoreCategoryRequest;
use App\Http\Requests\Category\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class CategoryController extends Controller
{
    public function index(ListCategoryRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $query = $request->user()->categories();
        $status = $filters['status'] ?? 'active';

        if ($status !== 'all') {
            $query->where('is_active', $status === 'active');
        }

        if (isset($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        return CategoryResource::collection(
            $query->orderBy('name')->orderBy('id')
                ->paginate($filters['per_page'] ?? 25)
                ->appends($request->only(['status', 'type', 'per_page']))
        );
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        try {
            // A relação define user_id; nunca utilizar o proprietário do payload.
            $category = $request->user()->categories()->create($request->validated());
        } catch (UniqueConstraintViolationException $exception) {
            // A constraint também cobre duas requisições concorrentes.
            throw ValidationException::withMessages([
                'name' => 'Você já possui uma categoria com esse nome e tipo.',
            ]);
        }

        return (new CategoryResource($category->refresh()))->response()->setStatusCode(201);
    }

    public function update(UpdateCategoryRequest $request): CategoryResource
    {
        $category = $request->category();

        try {
            $category->update($request->validated());
        } catch (UniqueConstraintViolationException $exception) {
            throw ValidationException::withMessages([
                'name' => 'Você já possui uma categoria com esse nome e tipo.',
            ]);
        }

        return new CategoryResource($category->refresh());
    }

    public function destroy(Request $request, string $category): Response
    {
        $ownedCategory = $request->user()->categories()->findOrFail($category);
        // DELETE é idempotente e não apaga registros nem futuros vínculos.
        $ownedCategory->update(['is_active' => false]);

        return response()->noContent();
    }
}
