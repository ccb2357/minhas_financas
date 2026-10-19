<?php

namespace App\Http\Requests\Category;

class StoreCategoryRequest extends CategoryRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return $this->categoryRules();
    }
}
