import re
path = r'C:\Users\CIfera At Work\AppData\Roaming\Zed\settings.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Models to add
models = [
    'Cx/gpt-5.5', 'Cx/gpt-5.5-xhigh', 'Cx/gpt-5.5-high', 'Cx/gpt-5.5-medium', 'Cx/gpt-5.5-low',
    'Cx/gpt-5.4', 'Cx/gpt-5.4-xhigh', 'Cx/gpt-5.4-high', 'Cx/gpt-5.4-medium', 'Cx/gpt-5.4-low', 'Cx/gpt-5.4-mini',
    'Cx/gpt-5.3-codex-spark', 'Cx/gpt-5.3-codex', 'Cx/gpt-5.2'
]

new_json_block = ""
for m in models:
    new_json_block += f"""          {{
            "name": "{m}",
            "max_tokens": 200000,
            "max_output_tokens": 32000,
            "max_completion_tokens": 200000,
            "capabilities": {{
              "tools": true,
              "images": false,
              "parallel_tool_calls": false,
              "prompt_cache_key": false,
              "chat_completions": true,
              "interleaved_reasoning": false,
            }},
          }},\n"""

# find where "cx/codex-auto-review" starts. We want to replace from before that block till the end of the codex blocks.
# A simple way is to find the block for missing codex models and replace them.
start_idx = content.find('          {\n            "name": "cx/codex-auto-review",')
if start_idx != -1:
    # Need to find the end of the codex-auto-review blocks
    end_str = '"name": "codex-auto-review",'
    end_idx = content.find(end_str, start_idx)
    if end_idx != -1:
        # Find the closing brace of that block
        closing_brace = content.find('          },', end_idx)
        if closing_brace != -1:
            end_replace = closing_brace + len('          },\n')
            
            # Replace
            content = content[:start_idx] + new_json_block + content[end_replace:]
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Successfully updated file!")
        else:
            print("Could not find closing brace")
    else:
        print("Could not find end block")
else:
    print("Could not find start block")

