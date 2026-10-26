<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Rules\IntegerCents;
use App\Services\Goals;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GoalController extends Controller
{
    public function __construct(private Goals $goals) {}

    private function pageRules(): array { return ['page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'between:1,100']]; }
    private function versionRules(): array { return ['version' => ['required', 'integer', 'min:1']]; }
    private function dateRules(): array { return ['date_format:Y-m-d', 'after_or_equal:1900-01-01', 'before_or_equal:2100-12-31']; }
    private function metadata(Request $request, bool $creating): array
    {
        if (is_string($request->input('name'))) $request->merge(['name' => trim($request->input('name'))]);
        return $request->validate([
            'name' => ['required', 'string', 'max:80'], 'icon' => ['required', Rule::in(Category::ICONS)],
            'target_cents' => ['required', new IntegerCents], 'deadline' => ['present', 'nullable', ...$this->dateRules()],
            'user_id' => ['prohibited'], 'saved_cents' => ['prohibited'], 'status' => ['prohibited'],
            ...($creating ? ['request_key' => ['required', 'uuid']] : $this->versionRules()),
        ]);
    }
    private function paginated($page, $data): array
    {
        return ['data' => $data, 'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()]];
    }

    public function index(Request $request)
    {
        $data = $request->validate($this->pageRules() + ['status' => ['sometimes', Rule::in(['active', 'archived'])]]);
        $page = $this->goals->query($request->user())->where('status', $data['status'] ?? 'active')->orderByDesc('id')->paginate($data['per_page'] ?? 25);
        return response()->json($this->paginated($page, $page->getCollection()->map(fn ($goal) => $this->goals->present($goal))));
    }
    public function show(Request $request, int $goal)
    {
        return response()->json(['data' => $this->goals->present($this->goals->find($request->user(), $goal))]);
    }
    public function store(Request $request)
    {
        $goal = $this->goals->create($request->user(), $this->metadata($request, true));
        return response()->json(['data' => $this->goals->present($goal)], 201);
    }
    public function update(Request $request, int $goal)
    {
        $data = $this->metadata($request, false);
        return response()->json(['data' => $this->goals->present($this->goals->update($request->user(), $goal, $data))]);
    }
    public function state(Request $request, int $goal)
    {
        $data = $request->validate($this->versionRules() + ['action' => ['required', Rule::in(['archive', 'complete', 'reopen'])]]);
        return response()->json(['data' => $this->goals->present($this->goals->state($request->user(), $goal, $data['action'], $data['version']))]);
    }
    public function destroy(Request $request, int $goal)
    {
        $data = $request->validate($this->versionRules()); $this->goals->delete($request->user(), $goal, $data['version']);
        return response()->noContent();
    }
    public function movements(Request $request, int $goal)
    {
        $data = $request->validate($this->pageRules()); $this->goals->find($request->user(), $goal);
        $page = DB::table('goal_movements')->where('goal_id', $goal)->orderByDesc('movement_date')->orderByDesc('id')->paginate($data['per_page'] ?? 25);
        $rows = $page->getCollection()->map(fn ($row) => ['id' => (int) $row->id, 'type' => $row->type,
            'amount_cents' => (int) $row->amount_cents, 'movement_date' => $row->movement_date, 'notes' => $row->notes]);
        return response()->json($this->paginated($page, $rows));
    }
    public function saveMovement(Request $request, int $goal, ?int $movement = null)
    {
        if (is_string($request->input('notes'))) $request->merge(['notes' => trim($request->input('notes')) ?: null]);
        $data = $request->validate($this->versionRules() + [
            'type' => ['required', Rule::in(['contribution', 'withdrawal'])], 'amount_cents' => ['required', new IntegerCents],
            'movement_date' => ['required', ...$this->dateRules()], 'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'user_id' => ['prohibited'], 'goal_id' => ['prohibited'],
        ] + ($movement ? [] : ['request_key' => ['required', 'uuid']]));
        return response()->json(['data' => $this->goals->present($this->goals->movement($request->user(), $goal, $data, $movement))], $movement ? 200 : 201);
    }
    public function deleteMovement(Request $request, int $goal, int $movement)
    {
        $data = $request->validate($this->versionRules());
        return response()->json(['data' => $this->goals->present($this->goals->movement($request->user(), $goal, $data, $movement, true))]);
    }
}
