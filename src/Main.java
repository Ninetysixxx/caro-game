import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

//TIP To <b>Run</b> code, press <shortcut actionId="Run"/> or
// click the <icon src="AllIcons.Actions.Execute"/> icon in the gutter.
public class Main {
    public static void main(String[] args) {
        int[] nums = {2, 9, 11, 15};
        int target = 9;
        System.out.printf(Arrays.toString(twoSum(nums, target)));
    }

    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> pos = new HashMap<>();

        for (int i=0; i<nums.length; i++) {
            Integer remainder = target - nums[i];
            if (pos.containsKey(remainder)) {
                return new int[]{pos.get(remainder), i};
            }
            pos.put(nums[i], i);
        }
        return null;
    }
}

