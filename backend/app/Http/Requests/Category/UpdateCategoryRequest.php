<?php

namespace App\Http\Requests\Category;

use App\Models\Category;

class UpdateCategoryRequest extends CategoryRequest
{
    private Category $ownedCategory;

    public function authorize(): bool
    {
        // Resolver antes de validar: ID alheio e inexistente retornam o mesmo 404.
        $this->ownedCategory = $this->user()->categories()
            ->findOrFail($this->route('category'));

        return true;
    }

    public function rules(): array
    {
        return $this->categoryRules($this->ownedCategory);
    }

    public function category(): Category
    {
        return $this->ownedCategory;
    }
}
