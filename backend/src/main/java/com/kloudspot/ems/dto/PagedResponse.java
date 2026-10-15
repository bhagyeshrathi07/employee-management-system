package com.kloudspot.ems.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Generic pagination envelope returned by list endpoints.
 *
 * @param <T> element type
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "PagedResponse", description = "Paginated result set")
public class PagedResponse<T> {

    @Schema(description = "Items on the current page")
    private List<T> content;

    @Schema(description = "Zero-based page index", example = "0")
    private int pageNumber;

    @Schema(description = "Requested page size", example = "10")
    private int pageSize;

    @Schema(description = "Total number of matching records", example = "25")
    private long totalElements;

    @Schema(description = "Total number of pages", example = "3")
    private int totalPages;

    @Schema(description = "True when this is the last page", example = "false")
    private boolean last;

    /**
     * Builds a {@link PagedResponse} from a Spring Data {@link Page}.
     */
    public static <T> PagedResponse<T> from(Page<T> page) {
        return PagedResponse.<T>builder()
                .content(page.getContent())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }
}
