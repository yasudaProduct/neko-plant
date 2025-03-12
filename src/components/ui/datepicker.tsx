import { ControllerRenderProps } from "react-hook-form";
import { Button } from "./button";
import { FormControl } from "./form";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "./calendar";
import { formatDateyyyymmdd } from "@/lib/utils";
type DatePickerProp = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any, string>;
};

export function DatePicker({ field }: DatePickerProp) {
  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant={"outline"}
            className={
              "w-full pl-3 text-left font-normal "
              // !field.value && "text-muted-foreground"
            }
          >
            {field.value ? field.value : <span>日付を選択</span>}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start">
        <Calendar
          mode="single"
          selected={field.value ? new Date(field.value) : undefined}
          onSelect={(date) => {
            field.onChange(date ? formatDateyyyymmdd(date.toISOString()) : "");
          }}
          // locale={ja}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
